import type { Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "../../services/supabase";

import type {
  ActiveMembership,
  OrganizationMembership,
  OrganizationSummary,
} from "./membership";

import {
  getMembershipRole,
  isMembershipActive,
} from "./membership";

import type {
  AppPermission,
  AppRole,
} from "./roles";

import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isAppRole,
  isRoleAtLeast,
} from "./roles";

type AuthContextValue = {
  session: Session | null;
  user: User | null;

  isAuthenticated: boolean;
  isLoading: boolean;
  isMembershipLoading: boolean;
  membershipError: string | null;

  membership: OrganizationMembership | null;
  organization: OrganizationSummary | null;
  activeMembership: ActiveMembership | null;

  role: AppRole | null;
  hasActiveMembership: boolean;

  can: (permission: AppPermission) => boolean;
  canAny: (permissions: readonly AppPermission[]) => boolean;
  canAll: (permissions: readonly AppPermission[]) => boolean;

  hasRoleAtLeast: (requiredRole: AppRole) => boolean;

  refreshMembership: () => Promise<void>;

  setActiveMembership: (
    membership: OrganizationMembership | null,
    organization?: OrganizationSummary | null
  ) => void;

  clearActiveMembership: () => void;

  signOut: () => Promise<void>;
};

type MembershipRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
};

const AuthContext =
  createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

function mapMembershipRow(
  row: MembershipRow
): OrganizationMembership | null {
  if (!isAppRole(row.role)) {
    console.warn(
      "[auth] Ignoring membership with invalid role:",
      row.role
    );

    return null;
  }

  if (
    row.status !== "pending" &&
    row.status !== "active" &&
    row.status !== "suspended" &&
    row.status !== "revoked"
  ) {
    console.warn(
      "[auth] Ignoring membership with invalid status:",
      row.status
    );

    return null;
  }

  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrganizationRow(
  row: OrganizationRow
): OrganizationSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
  };
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [isAuthLoading, setIsAuthLoading] =
    useState(true);

  const [
    isMembershipLoading,
    setIsMembershipLoading,
  ] = useState(false);

  const [
    membershipError,
    setMembershipError,
  ] = useState<string | null>(null);

  const [membership, setMembership] =
    useState<OrganizationMembership | null>(null);

  const [organization, setOrganization] =
    useState<OrganizationSummary | null>(null);

  const mountedRef = useRef(true);

  const membershipRequestRef =
    useRef(0);

  const lastLoadedUserRef =
    useRef<string | null>(null);

  const clearMembershipState =
    useCallback(() => {
      lastLoadedUserRef.current = null;
      membershipRequestRef.current += 1;

      setMembership(null);
      setOrganization(null);
      setMembershipError(null);
      setIsMembershipLoading(false);
    }, []);

  const loadMembershipForUser = useCallback(
    async (
      userId: string,
      force = false
    ) => {
      if (
        !force &&
        lastLoadedUserRef.current === userId
      ) {
        return;
      }

      const requestId =
        ++membershipRequestRef.current;

      lastLoadedUserRef.current = userId;

      if (mountedRef.current) {
        setIsMembershipLoading(true);
        setMembershipError(null);
      }

      try {
        const {
          data: membershipData,
          error: membershipQueryError,
        } = await supabase
          .from("organization_members")
          .select(
            [
              "id",
              "organization_id",
              "user_id",
              "role",
              "status",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .eq("user_id", userId)
          .eq("status", "active")
          .order("created_at", {
            ascending: true,
          })
          .limit(1)
          .maybeSingle();

        if (
          !mountedRef.current ||
          requestId !==
            membershipRequestRef.current
        ) {
          return;
        }

        if (membershipQueryError) {
          throw membershipQueryError;
        }

        if (!membershipData) {
          setMembership(null);
          setOrganization(null);
          return;
        }

        const mappedMembership =
          mapMembershipRow(
            membershipData as unknown as MembershipRow
          );

        if (!mappedMembership) {
          setMembership(null);
          setOrganization(null);

          setMembershipError(
            "The active organization membership is invalid."
          );

          return;
        }

        const {
          data: organizationData,
          error: organizationQueryError,
        } = await supabase
          .from("organizations")
          .select("id,name,slug")
          .eq(
            "id",
            mappedMembership.organizationId
          )
          .maybeSingle();

        if (
          !mountedRef.current ||
          requestId !==
            membershipRequestRef.current
        ) {
          return;
        }

        if (organizationQueryError) {
          throw organizationQueryError;
        }

        if (!organizationData) {
          setMembership(null);
          setOrganization(null);

          setMembershipError(
            "The organization for this membership could not be loaded."
          );

          return;
        }

        setMembership(mappedMembership);

        setOrganization(
          mapOrganizationRow(
            organizationData as OrganizationRow
          )
        );
      } catch (error) {
        if (
          !mountedRef.current ||
          requestId !==
            membershipRequestRef.current
        ) {
          return;
        }

        lastLoadedUserRef.current = null;

        console.warn(
          "[auth] Membership loading failed:",
          error
        );

        setMembership(null);
        setOrganization(null);

        setMembershipError(
          error instanceof Error
            ? error.message
            : "Could not load organization membership."
        );
      } finally {
        if (
          mountedRef.current &&
          requestId ===
            membershipRequestRef.current
        ) {
          setIsMembershipLoading(false);
        }
      }
    },
    []
  );

  const refreshMembership =
    useCallback(async () => {
      const userId =
        session?.user?.id ?? null;

      if (!userId) {
        clearMembershipState();
        return;
      }

      lastLoadedUserRef.current = null;

      await loadMembershipForUser(
        userId,
        true
      );
    }, [
      session?.user?.id,
      clearMembershipState,
      loadMembershipForUser,
    ]);

  useEffect(() => {
    mountedRef.current = true;

    let initialized = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!mountedRef.current) {
          return;
        }

        setSession(nextSession);

        const nextUserId =
          nextSession?.user?.id ?? null;

        if (!nextUserId) {
          clearMembershipState();

          if (!initialized) {
            initialized = true;
            setIsAuthLoading(false);
          }

          return;
        }

        const shouldForceReload =
          event === "SIGNED_IN" ||
          event === "USER_UPDATED";

        void loadMembershipForUser(
          nextUserId,
          shouldForceReload
        );

        if (!initialized) {
          initialized = true;
          setIsAuthLoading(false);
        }
      }
    );

    /*
     * getSession is used once only as a fallback for
     * environments where the initial auth event is delayed.
     *
     * It does NOT load membership directly. Membership is
     * always coordinated through loadMembershipForUser.
     */
    const initialize = async () => {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (!mountedRef.current) {
          return;
        }

        if (error) {
          console.warn(
            "[auth] Could not restore session:",
            error.message
          );

          if (!initialized) {
            initialized = true;
            setSession(null);
            clearMembershipState();
            setIsAuthLoading(false);
          }

          return;
        }

        if (!initialized) {
          initialized = true;

          const restoredSession =
            data.session ?? null;

          setSession(restoredSession);

          const restoredUserId =
            restoredSession?.user?.id ?? null;

          if (restoredUserId) {
            void loadMembershipForUser(
              restoredUserId
            );
          } else {
            clearMembershipState();
          }

          setIsAuthLoading(false);
        }
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        console.warn(
          "[auth] Session initialization failed:",
          error
        );

        if (!initialized) {
          initialized = true;
          setSession(null);
          clearMembershipState();
          setIsAuthLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [
    clearMembershipState,
    loadMembershipForUser,
  ]);

  const role =
    useMemo<AppRole | null>(() => {
      return getMembershipRole(membership);
    }, [membership]);

  const hasActiveMembership =
    useMemo(() => {
      return isMembershipActive(membership);
    }, [membership]);

  const activeMembership =
    useMemo<ActiveMembership | null>(() => {
      if (
        !membership ||
        !isMembershipActive(membership)
      ) {
        return null;
      }

      return {
        membership,
        organization,
      };
    }, [
      membership,
      organization,
    ]);

  const can = useCallback(
    (permission: AppPermission) => {
      return hasPermission(
        role,
        permission
      );
    },
    [role]
  );

  const canAny = useCallback(
    (
      permissions:
        readonly AppPermission[]
    ) => {
      return hasAnyPermission(
        role,
        permissions
      );
    },
    [role]
  );

  const canAll = useCallback(
    (
      permissions:
        readonly AppPermission[]
    ) => {
      return hasAllPermissions(
        role,
        permissions
      );
    },
    [role]
  );

  const hasRoleAtLeast =
    useCallback(
      (requiredRole: AppRole) => {
        return isRoleAtLeast(
          role,
          requiredRole
        );
      },
      [role]
    );

  const setActiveMembership =
    useCallback(
      (
        nextMembership:
          OrganizationMembership | null,
        nextOrganization:
          OrganizationSummary | null = null
      ) => {
        if (!nextMembership) {
          clearMembershipState();
          return;
        }

        if (
          !isMembershipActive(
            nextMembership
          )
        ) {
          console.warn(
            "[auth] Refusing to activate a non-active membership."
          );

          clearMembershipState();
          return;
        }

        lastLoadedUserRef.current =
          nextMembership.userId;

        setMembership(nextMembership);
        setOrganization(
          nextOrganization
        );
        setMembershipError(null);
      },
      [clearMembershipState]
    );

  const clearActiveMembership =
    useCallback(() => {
      clearMembershipState();
    }, [clearMembershipState]);

  const signOut =
    useCallback(async () => {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setSession(null);
      clearMembershipState();
    }, [clearMembershipState]);

  const value =
    useMemo<AuthContextValue>(
      () => ({
        session,
        user:
          session?.user ?? null,

        isAuthenticated:
          Boolean(session?.user),

        isLoading:
          isAuthLoading ||
          isMembershipLoading,

        isMembershipLoading,
        membershipError,

        membership,
        organization,
        activeMembership,

        role,
        hasActiveMembership,

        can,
        canAny,
        canAll,
        hasRoleAtLeast,

        refreshMembership,

        setActiveMembership,
        clearActiveMembership,

        signOut,
      }),
      [
        session,
        isAuthLoading,
        isMembershipLoading,
        membershipError,
        membership,
        organization,
        activeMembership,
        role,
        hasActiveMembership,
        can,
        canAny,
        canAll,
        hasRoleAtLeast,
        refreshMembership,
        setActiveMembership,
        clearActiveMembership,
        signOut,
      ]
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}