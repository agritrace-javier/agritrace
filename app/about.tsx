// app/about.tsx
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Lang } from "./i18n";
import { t as I18N } from "./i18n";
import { useLots } from "./lots-store";
import { getTheme } from "./theme";

type TT = (typeof I18N)[Lang];

export default function AboutScreen() {
  const router = useRouter();
  const { lang, setLang, themeName } = useLots();
  const tt: TT = I18N[lang];

  const theme = useMemo(() => getTheme(themeName), [themeName]);
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.replace("/")}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Text style={styles.backBtnText}>← {tt.back}</Text>
          </Pressable>

          {/* ✅ Language toggle */}
          <View style={styles.langWrap}>
            <Pressable
              onPress={() => setLang("en")}
              style={({ pressed }) => [
                styles.langBtn,
                lang === "en" && styles.langBtnActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.langText, lang === "en" && styles.langTextActive]}>EN</Text>
            </Pressable>
            <Pressable
              onPress={() => setLang("es")}
              style={({ pressed }) => [
                styles.langBtn,
                lang === "es" && styles.langBtnActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.langText, lang === "es" && styles.langTextActive]}>ES</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/catalog")}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryBtnText}>{tt.aboutGoCatalog}</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{tt.aboutTitle}</Text>
        <Text style={styles.subtitle}>{tt.aboutSubtitle}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{tt.aboutSectionWhatTitle}</Text>
          <Text style={styles.p}>{tt.aboutSectionWhatBody}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>{tt.aboutSectionHowTitle}</Text>
          <View style={styles.bullets}>
            <Text style={styles.bullet}>• {tt.aboutHow1}</Text>
            <Text style={styles.bullet}>• {tt.aboutHow2}</Text>
            <Text style={styles.bullet}>• {tt.aboutHow3}</Text>
            <Text style={styles.bullet}>• {tt.aboutHow4}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>{tt.aboutSectionWhyTitle}</Text>
          <Text style={styles.p}>{tt.aboutSectionWhyBody}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>{tt.aboutSectionImpactTitle}</Text>
          <View style={styles.bullets}>
            <Text style={styles.bullet}>• {tt.aboutImpact1}</Text>
            <Text style={styles.bullet}>• {tt.aboutImpact2}</Text>
            <Text style={styles.bullet}>• {tt.aboutImpact3}</Text>
          </View>
        </View>

        <Text style={styles.footerHint}>
          {Platform.OS === "web" ? tt.aboutTipWeb : tt.aboutTipMobile}
        </Text>
      </ScrollView>
    </View>
  );
}

type ThemeColors = ReturnType<typeof getTheme>["colors"];

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg },

    scroll: { flex: 1 },
    scrollContent: {
      padding: 20,
      paddingBottom: 34,
    },

    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 14,
      flexWrap: "wrap",
    },

    backBtn: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    backBtnText: { color: c.text, fontWeight: "900", letterSpacing: 0.6 },

    langWrap: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: c.card,
    },
    langBtn: { paddingVertical: 9, paddingHorizontal: 12 },
    langBtnActive: { backgroundColor: c.segmentBg },
    langText: { color: c.muted, fontWeight: "900", letterSpacing: 0.6, fontSize: 12 },
    langTextActive: { color: c.text },

    primaryBtn: {
      backgroundColor: c.green,
      borderColor: c.green,
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    primaryBtnText: { color: "white", fontWeight: "900", letterSpacing: 0.6 },

    pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },

    title: { color: c.text, fontSize: 34, fontWeight: "900", letterSpacing: 1, marginTop: 2 },
    subtitle: { marginTop: 8, color: c.muted, fontWeight: "800", letterSpacing: 0.2 },

    card: {
      marginTop: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      padding: 14,
      maxWidth: 900,
    },

    sectionTitle: { color: c.text, fontSize: 14, fontWeight: "900", letterSpacing: 0.6 },
    p: { marginTop: 8, color: c.text, opacity: 0.92, lineHeight: 20, letterSpacing: 0.2 },

    divider: { marginTop: 14, height: 1, backgroundColor: c.border, opacity: 0.8 },

    bullets: { marginTop: 10, gap: 8 },
    bullet: { color: c.text, opacity: 0.92, lineHeight: 20, letterSpacing: 0.2 },

    footerHint: { marginTop: 12, color: c.muted, fontWeight: "800", letterSpacing: 0.2 },
  });
