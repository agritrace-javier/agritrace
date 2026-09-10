import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useLots } from "./lots-store";
import {
  colors,
  layout,
  radius,
  spacing,
  typography,
} from "../src/theme/tokens";

const copy = {
  en: {
    navHome: "Home",
    navAbout: "About",
    navHow: "How It Works",
    navProducers: "For Producers",
    navBuyers: "For Buyers",

    login: "Log in",
    platform: "Open Platform",

    badge: "AGRICULTURAL TRACEABILITY PLATFORM",

    title1: "Trace agricultural",
    title2: "products from",
    title3: "origin to buyer.",

    subtitle:
      "AgriTrace gives producers, buyers and institutions a transparent digital record of every agricultural lot — from harvest and processing to quality verification and delivery.",

    verify: "Verify a Product",
    explore: "Explore Platform",

    land: "FROM OUR LAND",
    world: "TO THE WORLD",

    record: "TRACEABILITY RECORD",
    product: "Coffee",
    location: "Santa Ana, El Salvador",
    verified: "Verified",

    harvest: "Harvest",
    harvestDetail: "Santa Ana, El Salvador",

    processing: "Processing",
    processingDetail: "Washed process",

    quality: "Quality",
    qualityDetail: "Integrity verified (SHA-256)",

    packaging: "Packaging",
    packagingDetail: "Lot LOT-0001",

    transparency: "Transparency",
    trust: "Trust",
    stronger: "Stronger Agriculture",

    qrTitle: "QR Traceability",
    qrText: "Instant product verification",

    historyTitle: "Complete History",
    historyText: "Every step in one record",

    integrityTitle: "Blockchain Verification",
    integrityText: "Cryptographic integrity + blockchain anchoring",

    agricultureTitle: "Built for Agriculture",
    agricultureText: "Producers to global buyers",

    lowerEyebrow: "A MORE TRANSPARENT AGRICULTURAL SUPPLY CHAIN",
    lowerTitle1: "Agriculture with",
    lowerTitle2: "greater trust.",

    lowerText:
      "One trusted record connects producers, buyers and institutions across the agricultural supply chain.",

    howEyebrow: "HOW AGRITRACE WORKS",
    howTitle: "From harvest to buyer.",
    howText:
      "Each agricultural lot builds a verifiable digital history as it moves through the supply chain.",

    step1: "Create",
    step1Text:
      "Register the agricultural lot, origin, harvest information and producer data.",

    step2: "Trace",
    step2Text:
      "Record processing, quality, packaging and logistics as they happen.",

    step3: "Verify on Blockchain",
    step3Text:
      "Create a cryptographic fingerprint of the lot record and anchor its verification on blockchain.",

    step4: "Connect",
    step4Text:
      "Give buyers and institutions transparent access to trusted product history.",

    blockchainEyebrow: "BLOCKCHAIN-BACKED TRACEABILITY",
    blockchainTitle1: "Trust that can be",
    blockchainTitle2: "independently verified.",
    blockchainText:
      "AgriTrace creates a cryptographic fingerprint of each traceability record. Blockchain anchoring provides an independent reference that helps detect whether agricultural data has been altered.",

    recordNode: "Agricultural Record",
    hashNode: "SHA-256 Hash",
    blockchainNode: "Blockchain Anchor",
    qrNode: "QR Verification",

    verificationRecord: "VERIFICATION RECORD",
    cryptographicHash: "Cryptographic Hash",
    verificationLayer: "Verification Layer",
    blockchainValue: "Blockchain",
    targetNetwork: "Target Network",
    networkValue: "Starknet",
    integrityLabel: "Integrity",
    integrityValue: "Record Match",
    statusLabel: "Status",
    statusValue: "Blockchain-ready",

    producerEyebrow: "BUILT FOR THE FIELD",
    producerTitle: "Simple for producers.",
    producerText:
      "Capture critical agricultural information from the field while building a professional digital record for every lot.",

    buyerEyebrow: "BUILT FOR TRUST",
    buyerTitle: "Clear for buyers.",
    buyerText:
      "Scan a QR code and understand where a product came from, how it was processed and how its record was verified.",

    footer:
      "Digital traceability infrastructure for modern agriculture.",
  },

  es: {
    navHome: "Inicio",
    navAbout: "Nosotros",
    navHow: "Cómo Funciona",
    navProducers: "Productores",
    navBuyers: "Compradores",

    login: "Iniciar sesión",
    platform: "Abrir Plataforma",

    badge: "PLATAFORMA DE TRAZABILIDAD AGRÍCOLA",

    title1: "Rastrea productos",
    title2: "agrícolas desde su",
    title3: "origen al comprador.",

    subtitle:
      "AgriTrace ofrece a productores, compradores e instituciones un registro digital transparente de cada lote agrícola — desde la cosecha y el procesamiento hasta la verificación de calidad y la entrega.",

    verify: "Verificar Producto",
    explore: "Explorar Plataforma",

    land: "DE NUESTRA TIERRA",
    world: "AL MUNDO",

    record: "REGISTRO DE TRAZABILIDAD",
    product: "Café",
    location: "Santa Ana, El Salvador",
    verified: "Verificado",

    harvest: "Cosecha",
    harvestDetail: "Santa Ana, El Salvador",

    processing: "Procesamiento",
    processingDetail: "Proceso lavado",

    quality: "Calidad",
    qualityDetail: "Integridad verificada (SHA-256)",

    packaging: "Empaque",
    packagingDetail: "Lote LOT-0001",

    transparency: "Transparencia",
    trust: "Confianza",
    stronger: "Agricultura más fuerte",

    qrTitle: "Trazabilidad QR",
    qrText: "Verificación instantánea del producto",

    historyTitle: "Historial Completo",
    historyText: "Cada etapa en un solo registro",

    integrityTitle: "Verificación Blockchain",
    integrityText: "Integridad criptográfica + anclaje blockchain",

    agricultureTitle: "Creado para Agricultura",
    agricultureText: "De productores a compradores globales",

    lowerEyebrow: "UNA CADENA AGRÍCOLA MÁS TRANSPARENTE",
    lowerTitle1: "Agricultura con",
    lowerTitle2: "mayor confianza.",

    lowerText:
      "Un registro confiable conecta productores, compradores e instituciones a través de toda la cadena agrícola.",

    howEyebrow: "CÓMO FUNCIONA AGRITRACE",
    howTitle: "De la cosecha al comprador.",
    howText:
      "Cada lote agrícola construye un historial digital verificable mientras avanza por la cadena de suministro.",

    step1: "Crear",
    step1Text:
      "Registra el lote agrícola, origen, información de cosecha y datos del productor.",

    step2: "Rastrear",
    step2Text:
      "Registra procesamiento, calidad, empaque y logística mientras ocurren.",

    step3: "Verificar en Blockchain",
    step3Text:
      "Crea una huella criptográfica del registro del lote y ancla su verificación en blockchain.",

    step4: "Conectar",
    step4Text:
      "Ofrece a compradores e instituciones acceso transparente al historial del producto.",

    blockchainEyebrow: "TRAZABILIDAD RESPALDADA POR BLOCKCHAIN",
    blockchainTitle1: "Confianza que puede ser",
    blockchainTitle2: "verificada independientemente.",
    blockchainText:
      "AgriTrace crea una huella criptográfica de cada registro de trazabilidad. El anclaje blockchain proporciona una referencia independiente que ayuda a detectar si los datos agrícolas han sido alterados.",

    recordNode: "Registro Agrícola",
    hashNode: "Hash SHA-256",
    blockchainNode: "Anclaje Blockchain",
    qrNode: "Verificación QR",

    verificationRecord: "REGISTRO DE VERIFICACIÓN",
    cryptographicHash: "Hash Criptográfico",
    verificationLayer: "Capa de Verificación",
    blockchainValue: "Blockchain",
    targetNetwork: "Red Objetivo",
    networkValue: "Starknet",
    integrityLabel: "Integridad",
    integrityValue: "Registro Coincide",
    statusLabel: "Estado",
    statusValue: "Blockchain-ready",

    producerEyebrow: "CREADO PARA EL CAMPO",
    producerTitle: "Simple para productores.",
    producerText:
      "Captura información agrícola crítica desde el campo mientras construyes un registro digital profesional para cada lote.",

    buyerEyebrow: "CREADO PARA GENERAR CONFIANZA",
    buyerTitle: "Claro para compradores.",
    buyerText:
      "Escanea un código QR y conoce de dónde viene un producto, cómo fue procesado y cómo se verificó su registro.",

    footer:
      "Infraestructura de trazabilidad digital para la agricultura moderna.",
  },
} as const;

type PageColors = {
  background: string;
  surface: string;
  surfaceSoft: string;
  statement: string;
  audience: string;
  text: string;
  textSecondary: string;
  border: string;
  greenSoft: string;
  cardShadow: string;
};

export default function LandingPage() {
  const { width } = useWindowDimensions();

  const {
    lang,
    setLang,
    themeName,
    setThemeName,
  } = useLots();

  const t = copy[lang];
  const isDark = themeName === "dark";
  const isMobile = width < 760;
  const isCompact = width < 1040;

  const pageColors: PageColors = {
    // V2.2:
    // Dark mode preserves the approved V2.1 visual direction.
    // Light mode uses warm agricultural neutrals + sage layers.
    background: isDark ? "#0B1510" : "#F7F5EE",
    surface: isDark ? "#122019" : "#FFFEFA",
    surfaceSoft: isDark ? "#101D16" : "#EEF2E8",
    statement: isDark ? "#101D16" : "#E3EBDD",
    audience: isDark ? "#101D16" : "#E8EDE2",
    text: isDark ? "#F5F8F6" : "#172019",
    textSecondary: isDark ? "#B8C5BD" : "#5A655C",
    border: isDark ? "#2B3D32" : "#D3DCCE",
    greenSoft: isDark ? "#193426" : "#E0EBDD",
    cardShadow: isDark ? "#000000" : "#435448",
  };

  const scrollToSection = (id: string) => {
    if (typeof document !== "undefined") {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <ScrollView
      style={[
        styles.screen,
        { backgroundColor: pageColors.background },
      ]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.container}>
        {/* HEADER */}
        <View
          style={[
            styles.nav,
            {
              borderBottomColor: pageColors.border,
              minHeight: isMobile ? 92 : 106,
            },
          ]}
        >
          <Pressable
            style={styles.brand}
            onPress={() => scrollToSection("home")}
          >
            <View style={styles.logoWindow}>
              <Image
                source={require("../assets/logo-mark.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text
              style={[
                styles.brandName,
                {
                  color: pageColors.text,
                  fontSize: isMobile ? 26 : 31,
                },
              ]}
            >
              AgriTrace
            </Text>
          </Pressable>

          {!isCompact ? (
            <View style={styles.desktopNavigation}>
              <Pressable onPress={() => scrollToSection("home")}>
                <Text
                  style={[
                    styles.navLink,
                    { color: pageColors.textSecondary },
                  ]}
                >
                  {t.navHome}
                </Text>
              </Pressable>

              <Pressable onPress={() => scrollToSection("about")}>
                <Text
                  style={[
                    styles.navLink,
                    { color: pageColors.textSecondary },
                  ]}
                >
                  {t.navAbout}
                </Text>
              </Pressable>

              <Pressable onPress={() => scrollToSection("how")}>
                <Text
                  style={[
                    styles.navLink,
                    { color: pageColors.textSecondary },
                  ]}
                >
                  {t.navHow}
                </Text>
              </Pressable>

              <Pressable onPress={() => scrollToSection("producers")}>
                <Text
                  style={[
                    styles.navLink,
                    { color: pageColors.textSecondary },
                  ]}
                >
                  {t.navProducers}
                </Text>
              </Pressable>

              <Pressable onPress={() => scrollToSection("buyers")}>
                <Text
                  style={[
                    styles.navLink,
                    { color: pageColors.textSecondary },
                  ]}
                >
                  {t.navBuyers}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.navRight}>
            <View
              style={[
                styles.selector,
                {
                  backgroundColor: pageColors.surface,
                  borderColor: pageColors.border,
                },
              ]}
            >
              <Ionicons
                name="globe-outline"
                size={17}
                color={colors.brand.primary}
              />

              <Pressable
                style={[
                  styles.languageButton,
                  lang === "en" && styles.selectorButtonActive,
                ]}
                onPress={() => setLang("en")}
              >
                <Text
                  style={[
                    styles.selectorText,
                    { color: pageColors.text },
                    lang === "en" && styles.selectorTextActive,
                  ]}
                >
                  EN
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.languageButton,
                  lang === "es" && styles.selectorButtonActive,
                ]}
                onPress={() => setLang("es")}
              >
                <Text
                  style={[
                    styles.selectorText,
                    { color: pageColors.text },
                    lang === "es" && styles.selectorTextActive,
                  ]}
                >
                  ES
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.themeSelector,
                {
                  backgroundColor: pageColors.surface,
                  borderColor: pageColors.border,
                },
              ]}
            >
              <Pressable
                style={[
                  styles.themeButton,
                  !isDark && styles.selectorButtonActive,
                ]}
                onPress={() => setThemeName("light")}
              >
                <Ionicons
                  name="sunny-outline"
                  size={17}
                  color={!isDark ? "#FFFFFF" : pageColors.text}
                />
              </Pressable>

              <Pressable
                style={[
                  styles.themeButton,
                  isDark && styles.selectorButtonActive,
                ]}
                onPress={() => setThemeName("dark")}
              >
                <Ionicons
                  name="moon-outline"
                  size={17}
                  color={isDark ? "#FFFFFF" : pageColors.text}
                />
              </Pressable>
            </View>

            {!isMobile ? (
              <Pressable
                style={[
                  styles.loginButton,
                  {
                    borderColor: pageColors.border,
                    backgroundColor: pageColors.surface,
                  },
                ]}
                onPress={() => router.push("/login")}
              >
                <Text
                  style={[
                    styles.loginText,
                    { color: pageColors.text },
                  ]}
                >
                  {t.login}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.platformButton}
              onPress={() => router.push("/dashboard")}
            >
              <Text style={styles.platformText}>
                {isMobile ? "Platform" : t.platform}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* HERO */}
        <View
          nativeID="home"
          style={[
            styles.heroShell,
            {
              minHeight: isMobile ? 780 : 620,
              shadowColor: pageColors.cardShadow,
              shadowOpacity: isDark ? 0.12 : 0.16,
            },
          ]}
        >
          <ImageBackground
            source={require("../assets/landing/coffee-hero.png")}
            resizeMode="cover"
            style={styles.heroBackground}
            imageStyle={styles.heroBackgroundImage}
          >
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: isDark
                    ? "rgba(4, 12, 7, 0.35)"
                    : "rgba(245, 242, 231, 0.08)",
                },
              ]}
            />

            <View
              style={[
                styles.leftReadabilityLayer,
                {
                  width: isMobile ? "100%" : "64%",
                  backgroundColor: isDark
                    ? "rgba(7, 17, 11, 0.74)"
                    : "rgba(249, 247, 239, 0.80)",
                },
              ]}
            />

            <View
              style={[
                styles.hero,
                {
                  flexDirection: isMobile ? "column" : "row",
                  paddingHorizontal: isMobile ? 22 : 46,
                  paddingVertical: isMobile ? 34 : 52,
                },
              ]}
            >
              <View
                style={[
                  styles.heroCopy,
                  {
                    minWidth: isMobile ? 0 : 300,
                    width: isMobile ? "100%" : undefined,
                  },
                ]}
              >
                <View style={styles.badge}>
                  <Ionicons
                    name="leaf-outline"
                    size={17}
                    color={isDark ? "#8FD1A9" : colors.brand.primary}
                  />

                  <Text
                    style={[
                      styles.badgeText,
                      isDark && styles.badgeTextDark,
                    ]}
                  >
                    {t.badge}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.heroTitle,
                    {
                      color: pageColors.text,
                      fontSize: isMobile ? 42 : 56,
                      lineHeight: isMobile ? 48 : 62,
                    },
                  ]}
                >
                  {t.title1}
                  {"\n"}
                  {t.title2}
                  {"\n"}
                  <Text style={styles.highlight}>
                    {t.title3}
                  </Text>
                </Text>

                <Text
                  style={[
                    styles.heroSubtitle,
                    {
                      color: isDark ? "#D5E0D9" : "#435047",
                    },
                  ]}
                >
                  {t.subtitle}
                </Text>

                <View style={styles.heroActions}>
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => router.push("/scan")}
                  >
                    <Ionicons
                      name="qr-code-outline"
                      size={22}
                      color="#FFFFFF"
                    />

                    <Text style={styles.primaryButtonText}>
                      {t.verify}
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#FFFFFF"
                    />
                  </Pressable>

                  <Pressable
                    style={[
                      styles.secondaryButton,
                      {
                        backgroundColor: isDark
                          ? "rgba(18,32,25,0.94)"
                          : "rgba(255,254,250,0.96)",
                        borderColor: pageColors.border,
                      },
                    ]}
                    onPress={() => router.push("/dashboard")}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {t.explore}
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={colors.brand.primary}
                    />
                  </Pressable>
                </View>

                <View style={styles.valuesRow}>
                  <Ionicons
                    name="leaf"
                    size={20}
                    color={colors.brand.primary}
                  />

                  <Text
                    style={[
                      styles.valueText,
                      { color: isDark ? "#D5E0D9" : "#435047" },
                    ]}
                  >
                    {t.transparency}
                  </Text>

                  <Text style={styles.valueDot}>•</Text>

                  <Text
                    style={[
                      styles.valueText,
                      { color: isDark ? "#D5E0D9" : "#435047" },
                    ]}
                  >
                    {t.trust}
                  </Text>

                  <Text style={styles.valueDot}>•</Text>

                  <Text
                    style={[
                      styles.valueText,
                      { color: isDark ? "#D5E0D9" : "#435047" },
                    ]}
                  >
                    {t.stronger}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.heroRight,
                  {
                    width: isMobile ? "100%" : undefined,
                    alignItems: isMobile ? "stretch" : "flex-end",
                  },
                ]}
              >
                {!isMobile ? (
                  <View style={styles.landMessage}>
                    <Text style={styles.landSmall}>{t.land}</Text>
                    <Text style={styles.landLarge}>{t.world}</Text>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.traceCard,
                    {
                      maxWidth: isMobile ? undefined : 420,
                      backgroundColor: isDark
                        ? "rgba(13, 35, 25, 0.88)"
                        : "rgba(255,254,250,0.94)",
                      borderColor: isDark
                        ? "rgba(164, 207, 181, 0.25)"
                        : "rgba(207, 220, 208, 0.90)",
                      shadowOpacity: isDark ? 0.23 : 0.18,
                      shadowColor: pageColors.cardShadow,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.traceHeader,
                      { borderBottomColor: pageColors.border },
                    ]}
                  >
                    <View style={styles.traceHeading}>
                      <Text style={styles.traceLabel}>
                        {t.record}
                      </Text>

                      <Text
                        style={[
                          styles.traceTitle,
                          { color: pageColors.text },
                        ]}
                      >
                        {t.product}
                      </Text>

                      <Text
                        style={[
                          styles.traceLocation,
                          { color: pageColors.textSecondary },
                        ]}
                      >
                        {t.location}
                      </Text>
                    </View>

                    <View style={styles.verified}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={colors.light.success}
                      />

                      <Text style={styles.verifiedText}>
                        {t.verified}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.timeline}>
                    <TraceStep
                      icon="leaf-outline"
                      title={t.harvest}
                      detail={t.harvestDetail}
                      pageColors={pageColors}
                    />

                    <TraceStep
                      icon="settings-outline"
                      title={t.processing}
                      detail={t.processingDetail}
                      pageColors={pageColors}
                    />

                    <TraceStep
                      icon="shield-checkmark-outline"
                      title={t.quality}
                      detail={t.qualityDetail}
                      pageColors={pageColors}
                    />

                    <TraceStep
                      icon="cube-outline"
                      title={t.packaging}
                      detail={t.packagingDetail}
                      pageColors={pageColors}
                      last
                    />
                  </View>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* TRUST STRIP */}
        <View
          style={[
            styles.trustRow,
            {
              borderTopColor: pageColors.border,
              borderBottomColor: pageColors.border,
            },
          ]}
        >
          <TrustItem
            icon="qr-code-outline"
            title={t.qrTitle}
            text={t.qrText}
            pageColors={pageColors}
          />

          <TrustItem
            icon="document-text-outline"
            title={t.historyTitle}
            text={t.historyText}
            pageColors={pageColors}
          />

          <TrustItem
            icon="shield-checkmark-outline"
            title={t.integrityTitle}
            text={t.integrityText}
            pageColors={pageColors}
          />

          <TrustItem
            icon="people-outline"
            title={t.agricultureTitle}
            text={t.agricultureText}
            pageColors={pageColors}
          />
        </View>
      </View>

      {/* TRUST STATEMENT */}
      <View
        nativeID="about"
        style={[
          styles.statementSection,
          {
            backgroundColor: pageColors.statement,
            borderTopColor: pageColors.border,
            borderBottomColor: pageColors.border,
          },
        ]}
      >
        <View style={styles.sectionInner}>
          <View
            style={[
              styles.sectionLeaf,
              {
                backgroundColor: isDark
                  ? "#E3F1E8"
                  : "#F8FAF4",
                borderColor: isDark
                  ? "transparent"
                  : pageColors.border,
              },
            ]}
          >
            <Ionicons
              name="leaf"
              size={27}
              color={colors.brand.primary}
            />
          </View>

          <Text style={styles.sectionEyebrow}>
            {t.lowerEyebrow}
          </Text>

          <Text
            style={[
              styles.statementTitle,
              {
                color: pageColors.text,
                fontSize: isMobile ? 35 : 46,
              },
            ]}
          >
            {t.lowerTitle1}{" "}
            <Text style={styles.highlight}>
              {t.lowerTitle2}
            </Text>
          </Text>

          <Text
            style={[
              styles.statementText,
              { color: pageColors.textSecondary },
            ]}
          >
            {t.lowerText}
          </Text>
        </View>
      </View>

      {/* HOW IT WORKS */}
      <View
        nativeID="how"
        style={[
          styles.howSection,
          { backgroundColor: pageColors.background },
        ]}
      >
        <View style={styles.sectionInner}>
          <Text style={styles.sectionEyebrow}>
            {t.howEyebrow}
          </Text>

          <Text
            style={[
              styles.howTitle,
              {
                color: pageColors.text,
                fontSize: isMobile ? 34 : 44,
              },
            ]}
          >
            {t.howTitle}
          </Text>

          <Text
            style={[
              styles.howIntro,
              { color: pageColors.textSecondary },
            ]}
          >
            {t.howText}
          </Text>

          <View style={styles.howGrid}>
            <ProcessCard
              number="01"
              icon="add-circle-outline"
              title={t.step1}
              text={t.step1Text}
              pageColors={pageColors}
              isDark={isDark}
            />

            <ProcessCard
              number="02"
              icon="git-branch-outline"
              title={t.step2}
              text={t.step2Text}
              pageColors={pageColors}
              isDark={isDark}
            />

            <ProcessCard
              number="03"
              icon="shield-checkmark-outline"
              title={t.step3}
              text={t.step3Text}
              pageColors={pageColors}
              isDark={isDark}
            />

            <ProcessCard
              number="04"
              icon="globe-outline"
              title={t.step4}
              text={t.step4Text}
              pageColors={pageColors}
              isDark={isDark}
            />
          </View>
        </View>
      </View>

      {/* BLOCKCHAIN VERIFICATION */}
      <View
        style={[
          styles.blockchainSection,
          {
            backgroundColor: isDark ? "#08130D" : "#173425",
          },
        ]}
      >
        <View
          style={[
            styles.blockchainInner,
            {
              flexDirection: isMobile ? "column" : "row",
            },
          ]}
        >
          <View style={styles.blockchainCopy}>
            <View style={styles.blockchainBadge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color="#7FD3A1"
              />

              <Text style={styles.blockchainEyebrow}>
                {t.blockchainEyebrow}
              </Text>
            </View>

            <Text
              style={[
                styles.blockchainTitle,
                {
                  fontSize: isMobile ? 35 : 46,
                  lineHeight: isMobile ? 42 : 53,
                },
              ]}
            >
              {t.blockchainTitle1}{" "}
              <Text style={styles.blockchainHighlight}>
                {t.blockchainTitle2}
              </Text>
            </Text>

            <Text style={styles.blockchainText}>
              {t.blockchainText}
            </Text>

            <View style={styles.verificationFlow}>
              <VerificationNode
                icon="document-text-outline"
                label={t.recordNode}
              />

              <FlowArrow />

              <VerificationNode
                icon="finger-print-outline"
                label={t.hashNode}
              />

              <FlowArrow />

              <VerificationNode
                icon="link-outline"
                label={t.blockchainNode}
              />

              <FlowArrow />

              <VerificationNode
                icon="qr-code-outline"
                label={t.qrNode}
              />
            </View>
          </View>

          <View style={styles.blockchainRecordWrap}>
            <View style={styles.blockchainRecord}>
              <View style={styles.blockchainRecordHeader}>
                <View>
                  <Text style={styles.blockchainRecordEyebrow}>
                    {t.verificationRecord}
                  </Text>

                  <Text style={styles.blockchainLot}>
                    LOT-0001
                  </Text>
                </View>

                <View style={styles.blockchainIconBadge}>
                  <Ionicons
                    name="cube-outline"
                    size={22}
                    color="#7FD3A1"
                  />
                </View>
              </View>

              <View style={styles.hashBox}>
                <Text style={styles.recordFieldLabel}>
                  {t.cryptographicHash}
                </Text>

                <Text
                  numberOfLines={1}
                  style={styles.hashValue}
                >
                  0x8f2a7c41...91c4
                </Text>
              </View>

              <RecordRow
                icon="layers-outline"
                label={t.verificationLayer}
                value={t.blockchainValue}
              />

              <RecordRow
                icon="globe-outline"
                label={t.targetNetwork}
                value={t.networkValue}
              />

              <RecordRow
                icon="checkmark-circle-outline"
                label={t.integrityLabel}
                value={t.integrityValue}
                success
              />

              <View style={styles.statusRow}>
                <View>
                  <Text style={styles.recordFieldLabel}>
                    {t.statusLabel}
                  </Text>

                  <Text style={styles.statusValue}>
                    {t.statusValue}
                  </Text>
                </View>

                <View style={styles.readyBadge}>
                  <View style={styles.readyDot} />

                  <Text style={styles.readyText}>
                    READY
                  </Text>
                </View>
              </View>

              <View style={styles.blockchainNotice}>
                <Ionicons
                  name="information-circle-outline"
                  size={17}
                  color="#91B8A0"
                />

                <Text style={styles.blockchainNoticeText}>
                  Starknet anchoring is represented as the target verification architecture while on-chain integration is completed.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
      {/* PRODUCERS / BUYERS */}
      <View
        style={[
          styles.audienceSection,
          {
            backgroundColor: pageColors.audience,
            borderTopColor: pageColors.border,
          },
        ]}
      >
        <View style={styles.audienceInner}>
          <View
            nativeID="producers"
            style={[
              styles.audienceCard,
              {
                backgroundColor: pageColors.surface,
                borderColor: pageColors.border,
                shadowColor: pageColors.cardShadow,
                shadowOpacity: isDark ? 0 : 0.10,
              },
            ]}
          >
            <View
              style={[
                styles.audienceIcon,
                { backgroundColor: pageColors.greenSoft },
              ]}
            >
              <Ionicons
                name="leaf-outline"
                size={30}
                color={colors.brand.primary}
              />
            </View>

            <Text style={styles.audienceEyebrow}>
              {t.producerEyebrow}
            </Text>

            <Text
              style={[
                styles.audienceTitle,
                { color: pageColors.text },
              ]}
            >
              {t.producerTitle}
            </Text>

            <Text
              style={[
                styles.audienceText,
                { color: pageColors.textSecondary },
              ]}
            >
              {t.producerText}
            </Text>
          </View>

          <View
            nativeID="buyers"
            style={[
              styles.audienceCard,
              {
                backgroundColor: pageColors.surface,
                borderColor: pageColors.border,
                shadowColor: pageColors.cardShadow,
                shadowOpacity: isDark ? 0 : 0.10,
              },
            ]}
          >
            <View
              style={[
                styles.audienceIcon,
                { backgroundColor: pageColors.greenSoft },
              ]}
            >
              <Ionicons
                name="scan-outline"
                size={30}
                color={colors.brand.primary}
              />
            </View>

            <Text style={styles.audienceEyebrow}>
              {t.buyerEyebrow}
            </Text>

            <Text
              style={[
                styles.audienceTitle,
                { color: pageColors.text },
              ]}
            >
              {t.buyerTitle}
            </Text>

            <Text
              style={[
                styles.audienceText,
                { color: pageColors.textSecondary },
              ]}
            >
              {t.buyerText}
            </Text>
          </View>
        </View>
      </View>

      {/* FOOTER */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: isDark ? "#07100B" : "#10271B",
          },
        ]}
      >
        <View style={styles.footerInner}>
          <View style={styles.footerBrand}>
            <Image
              source={require("../assets/logo-mark.png")}
              style={styles.footerLogo}
              resizeMode="contain"
            />

            <Text style={styles.footerBrandName}>
              AgriTrace
            </Text>
          </View>

          <Text style={styles.footerText}>
            {t.footer}
          </Text>

          <Text style={styles.footerCopyright}>
            © 2026 AgriTrace
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function TraceStep({
  icon,
  title,
  detail,
  pageColors,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  pageColors: PageColors;
  last?: boolean;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepRail}>
        <View
          style={[
            styles.stepIcon,
            { backgroundColor: pageColors.greenSoft },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={colors.brand.primary}
          />
        </View>

        {!last ? (
          <View
            style={[
              styles.line,
              { backgroundColor: pageColors.border },
            ]}
          />
        ) : null}
      </View>

      <View style={styles.stepContent}>
        <Text
          style={[
            styles.stepTitle,
            { color: pageColors.text },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.stepDetail,
            { color: pageColors.textSecondary },
          ]}
        >
          {detail}
        </Text>
      </View>
    </View>
  );
}

function TrustItem({
  icon,
  title,
  text,
  pageColors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  pageColors: PageColors;
}) {
  return (
    <View style={styles.trustItem}>
      <View
        style={[
          styles.trustIcon,
          { backgroundColor: pageColors.greenSoft },
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color={colors.brand.primary}
        />
      </View>

      <View style={styles.trustCopy}>
        <Text
          style={[
            styles.trustTitle,
            { color: pageColors.text },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.trustText,
            { color: pageColors.textSecondary },
          ]}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

function VerificationNode({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.verificationNode}>
      <View style={styles.verificationNodeIcon}>
        <Ionicons
          name={icon}
          size={22}
          color="#7FD3A1"
        />
      </View>

      <Text style={styles.verificationNodeText}>
        {label}
      </Text>
    </View>
  );
}

function FlowArrow() {
  return (
    <View style={styles.flowArrow}>
      <Ionicons
        name="arrow-forward"
        size={18}
        color="#668D75"
      />
    </View>
  );
}

function RecordRow({
  icon,
  label,
  value,
  success = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <View style={styles.recordRow}>
      <View style={styles.recordRowLeft}>
        <View style={styles.recordRowIcon}>
          <Ionicons
            name={icon}
            size={18}
            color={success ? "#7FD3A1" : "#91B8A0"}
          />
        </View>

        <Text style={styles.recordFieldLabel}>
          {label}
        </Text>
      </View>

      <Text
        style={[
          styles.recordValue,
          success && styles.recordValueSuccess,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
function ProcessCard({
  number,
  icon,
  title,
  text,
  pageColors,
  isDark,
}: {
  number: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  pageColors: PageColors;
  isDark: boolean;
}) {
  return (
    <View
      style={[
        styles.processCard,
        {
          backgroundColor: pageColors.surface,
          borderColor: pageColors.border,
          shadowColor: pageColors.cardShadow,
          shadowOpacity: isDark ? 0 : 0.09,
        },
      ]}
    >
      <View style={styles.processTop}>
        <View
          style={[
            styles.processIcon,
            { backgroundColor: pageColors.greenSoft },
          ]}
        >
          <Ionicons
            name={icon}
            size={25}
            color={colors.brand.primary}
          />
        </View>

        <Text style={styles.processNumber}>
          {number}
        </Text>
      </View>

      <Text
        style={[
          styles.processTitle,
          { color: pageColors.text },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.processText,
          { color: pageColors.textSecondary },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
  },

  container: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
  },

  nav: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderBottomWidth: 1,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  logoWindow: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },

  logo: {
    width: 92,
    height: 92,
  },

  brandName: {
    fontWeight: typography.weight.extraBold,
    letterSpacing: -0.8,
  },

  desktopNavigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
    marginHorizontal: spacing.md,
  },

  navLink: {
    fontSize: 13,
    fontWeight: typography.weight.semibold,
  },

  navRight: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 7,
  },

  selector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    padding: 4,
    paddingLeft: 9,
    borderWidth: 1,
    borderRadius: radius.full,
  },

  languageButton: {
    minWidth: 38,
    paddingHorizontal: 8,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: radius.full,
  },

  themeSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    borderWidth: 1,
    borderRadius: radius.full,
  },

  themeButton: {
    width: 34,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },

  selectorButtonActive: {
    backgroundColor: colors.brand.primary,
  },

  selectorText: {
    fontSize: 12,
    fontWeight: typography.weight.bold,
  },

  selectorTextActive: {
    color: "#FFFFFF",
  },

  loginButton: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderRadius: radius.md,
  },

  loginText: {
    fontSize: 13,
    fontWeight: typography.weight.semibold,
  },

  platformButton: {
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primary,
  },

  platformText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: typography.weight.bold,
  },

  heroShell: {
    width: "100%",
    marginTop: 22,
    borderRadius: 28,
    overflow: "hidden",
    shadowRadius: 30,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    elevation: 6,
  },

  heroBackground: {
    flex: 1,
    width: "100%",
    minHeight: 620,
  },

  heroBackgroundImage: {
    borderRadius: 28,
  },

  leftReadabilityLayer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },

  hero: {
    flex: 1,
    alignItems: "center",
    gap: 46,
  },

  heroCopy: {
    flex: 1.1,
    zIndex: 2,
  },

  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  badgeText: {
    color: colors.brand.primaryDark,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.7,
  },

  badgeTextDark: {
    color: "#9CD8B4",
  },

  heroTitle: {
    marginTop: 20,
    maxWidth: 690,
    fontWeight: typography.weight.extraBold,
    letterSpacing: -1.8,
  },

  highlight: {
    color: colors.brand.primary,
  },

  heroSubtitle: {
    marginTop: 20,
    maxWidth: 600,
    fontSize: 17,
    lineHeight: 27,
    fontWeight: typography.weight.medium,
  },

  heroActions: {
    marginTop: 27,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primary,
    shadowColor: "#0B3B25",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: typography.weight.bold,
  },

  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderWidth: 1,
    borderRadius: radius.md,
  },

  secondaryButtonText: {
    color: colors.brand.primary,
    fontSize: 15,
    fontWeight: typography.weight.bold,
  },

  valuesRow: {
    marginTop: 23,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },

  valueText: {
    fontSize: 12,
    fontWeight: typography.weight.semibold,
  },

  valueDot: {
    color: colors.brand.primary,
    fontSize: 17,
  },

  heroRight: {
    flex: 0.9,
    minWidth: 290,
    justifyContent: "center",
    zIndex: 2,
  },

  landMessage: {
    alignSelf: "flex-end",
    marginRight: 4,
    marginBottom: 15,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: "rgba(8, 29, 18, 0.60)",
  },

  landSmall: {
    color: "#D5E8DB",
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 2.3,
    textAlign: "right",
  },

  landLarge: {
    marginTop: 2,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: typography.weight.extraBold,
    letterSpacing: 1,
    textAlign: "right",
  },

  traceCard: {
    width: "100%",
    padding: 23,
    borderRadius: 22,
    borderWidth: 1,
    shadowRadius: 28,
    shadowOffset: {
      width: 0,
      height: 15,
    },
    elevation: 10,
  },

  traceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingBottom: 19,
    borderBottomWidth: 1,
  },

  traceHeading: {
    flex: 1,
  },

  traceLabel: {
    color: "#39B879",
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },

  traceTitle: {
    marginTop: 7,
    fontSize: 25,
    fontWeight: typography.weight.extraBold,
  },

  traceLocation: {
    marginTop: 3,
    fontSize: 13,
  },

  verified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: "#EAF7EE",
  },

  verifiedText: {
    color: colors.light.success,
    fontSize: 10,
    fontWeight: typography.weight.bold,
  },

  timeline: {
    paddingTop: 20,
  },

  step: {
    flexDirection: "row",
    minHeight: 68,
  },

  stepRail: {
    width: 42,
    alignItems: "center",
  },

  stepIcon: {
    width: 35,
    height: 35,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  line: {
    width: 2,
    flex: 1,
  },

  stepContent: {
    flex: 1,
    paddingLeft: 7,
    paddingTop: 3,
  },

  stepTitle: {
    fontSize: 13,
    fontWeight: typography.weight.bold,
  },

  stepDetail: {
    marginTop: 3,
    fontSize: 11,
  },

  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 30,
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },

  trustItem: {
    flex: 1,
    minWidth: 220,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 13,
  },

  trustIcon: {
    width: 53,
    height: 53,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },

  trustCopy: {
    flex: 1,
  },

  trustTitle: {
    fontSize: 13,
    fontWeight: typography.weight.bold,
  },

  trustText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 17,
  },

  statementSection: {
    width: "100%",
    marginTop: 34,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 82,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },

  sectionInner: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    alignItems: "center",
  },

  sectionLeaf: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 1,
  },

  sectionEyebrow: {
    marginTop: 17,
    color: colors.brand.primary,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    letterSpacing: 2,
    textAlign: "center",
  },

  statementTitle: {
    marginTop: 11,
    maxWidth: 850,
    lineHeight: 54,
    fontWeight: typography.weight.extraBold,
    letterSpacing: -1.2,
    textAlign: "center",
  },

  statementText: {
    marginTop: 14,
    maxWidth: 720,
    fontSize: 16,
    lineHeight: 25,
    textAlign: "center",
  },

  howSection: {
    width: "100%",
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 88,
  },

  howTitle: {
    marginTop: 10,
    fontWeight: typography.weight.extraBold,
    letterSpacing: -1,
    textAlign: "center",
  },

  howIntro: {
    marginTop: 13,
    maxWidth: 690,
    fontSize: 16,
    lineHeight: 25,
    textAlign: "center",
  },

  howGrid: {
    width: "100%",
    marginTop: 45,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },

  processCard: {
    flex: 1,
    minWidth: 235,
    padding: 24,
    borderWidth: 1,
    borderRadius: 20,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 3,
  },

  processTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  processIcon: {
    width: 49,
    height: 49,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  processNumber: {
    color: "#8FA294",
    fontSize: 13,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
  },

  processTitle: {
    marginTop: 23,
    fontSize: 20,
    fontWeight: typography.weight.extraBold,
  },

  processText: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 21,
  },

  blockchainSection: {
    width: "100%",
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 88,
    borderTopWidth: 1,
    borderTopColor: "rgba(150, 195, 168, 0.14)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 195, 168, 0.14)",
  },

  blockchainInner: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    alignItems: "center",
    gap: 60,
  },

  blockchainCopy: {
    flex: 1.1,
    minWidth: 290,
  },

  blockchainBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  blockchainEyebrow: {
    color: "#7FD3A1",
    fontSize: 11,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.8,
  },

  blockchainTitle: {
    marginTop: 18,
    maxWidth: 620,
    color: "#F4F8F5",
    fontWeight: typography.weight.extraBold,
    letterSpacing: -1.3,
  },

  blockchainHighlight: {
    color: "#62C98B",
  },

  blockchainText: {
    marginTop: 18,
    maxWidth: 620,
    color: "#B9CCC0",
    fontSize: 15,
    lineHeight: 25,
  },

  verificationFlow: {
    marginTop: 34,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },

  verificationNode: {
    minWidth: 108,
    flex: 1,
    maxWidth: 145,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(127, 211, 161, 0.20)",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.035)",
  },

  verificationNodeIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(65, 160, 103, 0.14)",
  },

  verificationNodeText: {
    marginTop: 10,
    color: "#E2ECE5",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: typography.weight.bold,
    textAlign: "center",
  },

  flowArrow: {
    alignItems: "center",
    justifyContent: "center",
  },

  blockchainRecordWrap: {
    flex: 0.9,
    width: "100%",
    minWidth: 290,
    maxWidth: 440,
  },

  blockchainRecord: {
    width: "100%",
    padding: 25,
    borderWidth: 1,
    borderColor: "rgba(127, 211, 161, 0.28)",
    borderRadius: 24,
    backgroundColor: "rgba(20, 49, 35, 0.92)",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 30,
    shadowOffset: {
      width: 0,
      height: 16,
    },
    elevation: 9,
  },

  blockchainRecordHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 20,
  },

  blockchainRecordEyebrow: {
    color: "#7FD3A1",
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.7,
  },

  blockchainLot: {
    marginTop: 7,
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: typography.weight.extraBold,
  },

  blockchainIconBadge: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: "rgba(127, 211, 161, 0.12)",
  },

  hashBox: {
    marginBottom: 7,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(127, 211, 161, 0.16)",
    borderRadius: 14,
    backgroundColor: "rgba(5, 18, 11, 0.38)",
  },

  recordFieldLabel: {
    color: "#91A99A",
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.7,
  },

  hashValue: {
    marginTop: 7,
    color: "#DFF5E7",
    fontSize: 14,
    fontWeight: typography.weight.semibold,
  },

  recordRow: {
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(154, 190, 168, 0.12)",
  },

  recordRowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  recordRowIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: "rgba(127, 211, 161, 0.08)",
  },

  recordValue: {
    color: "#F1F6F3",
    fontSize: 12,
    fontWeight: typography.weight.bold,
    textAlign: "right",
  },

  recordValueSuccess: {
    color: "#7FD3A1",
  },

  statusRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
  },

  statusValue: {
    marginTop: 5,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: typography.weight.bold,
  },

  readyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: "rgba(127, 211, 161, 0.10)",
  },

  readyDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: "#7FD3A1",
  },

  readyText: {
    color: "#8BD8A9",
    fontSize: 9,
    fontWeight: typography.weight.extraBold,
    letterSpacing: 1.1,
  },

  blockchainNotice: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "rgba(154, 190, 168, 0.12)",
  },

  blockchainNoticeText: {
    flex: 1,
    color: "#91A99A",
    fontSize: 9,
    lineHeight: 14,
  },
  audienceSection: {
    width: "100%",
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 78,
    borderTopWidth: 1,
  },

  audienceInner: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },

  audienceCard: {
    flex: 1,
    minWidth: 290,
    padding: 32,
    borderWidth: 1,
    borderRadius: 24,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 9,
    },
    elevation: 3,
  },

  audienceIcon: {
    width: 58,
    height: 58,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  audienceEyebrow: {
    marginTop: 23,
    color: colors.brand.primary,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.7,
  },

  audienceTitle: {
    marginTop: 9,
    fontSize: 27,
    fontWeight: typography.weight.extraBold,
  },

  audienceText: {
    marginTop: 11,
    maxWidth: 500,
    fontSize: 14,
    lineHeight: 23,
  },

  footer: {
    width: "100%",
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 38,
  },

  footerInner: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
  },

  footerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  footerLogo: {
    width: 52,
    height: 52,
  },

  footerBrandName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: typography.weight.extraBold,
  },

  footerText: {
    color: "#BFD0C5",
    fontSize: 12,
    textAlign: "center",
  },

  footerCopyright: {
    color: "#8EA397",
    fontSize: 11,
  },
});
