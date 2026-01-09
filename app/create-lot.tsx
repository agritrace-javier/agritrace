// app/create-lot.tsx
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { t as I18N } from "./i18n";
import { useLots } from "./lots-store";
import { getTheme } from "./theme";

function makeLotId() {
  const code = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LOT-${code}`;
}

export default function CreateLotScreen() {
  const router = useRouter();

  const { addLot, lang, mode, themeName } = useLots();
  const tt = I18N[lang];

  const theme = useMemo(() => getTheme(themeName), [themeName]);
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);

  // ✅ Gate: SOLO OPERATOR
  useEffect(() => {
    if (mode !== "operator") {
      if (Platform.OS !== "web") {
        Alert.alert(tt.wrongPin, tt.tryAgain);
      }
      router.replace("/catalog");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, router]);

  // Evita render “flash” si está en client
  if (mode !== "operator") {
    return <View style={styles.page} />;
  }

  const [productEn, setProductEn] = useState("");
  const [productEs, setProductEs] = useState("");
  const [origin, setOrigin] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [batch, setBatch] = useState("");
  const [notes, setNotes] = useState("");

  const handleBack = () => {
    router.replace("/catalog");
  };

  const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

  const onSave = () => {
    const pe = productEn.trim();
    const ps = productEs.trim();
    const o = origin.trim();
    const h = harvestDate.trim();
    const b = batch.trim();
    const n = notes.trim();

    if (!o || !h || !b || (!pe && !ps)) {
      Alert.alert(tt.missingFields, tt.fillRequired);
      return;
    }

    if (!isValidDate(h)) {
      Alert.alert(tt.invalidDate, tt.dateFormatHint);
      return;
    }

    // ✅ si llenas solo uno, copiamos al otro
    const finalEn = pe || ps;
    const finalEs = ps || pe;

    const id = makeLotId();

    addLot({
      id,
      product_en: finalEn,
      product_es: finalEs,
      origin: o,
      harvestDate: h,
      batch: b,
      notes: n || undefined,
    });

    if (Platform.OS === "web") {
      // @ts-ignore
      globalThis?.alert?.(`${tt.saved}: ${id}`);
    } else {
      Alert.alert(tt.saved, `${tt.lotCreated} ${id}`);
    }

    router.replace("/catalog");
  };

  const productEnLabel = lang === "es" ? "Producto (EN)" : "Product (EN)";
  const productEsLabel = lang === "es" ? "Producto (ES)" : "Product (ES)";

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backBtnText}>← {tt.back}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.title}>{tt.createLotTitle}</Text>
        <Text style={styles.sub}>{tt.createLotSub}</Text>

        {/* Product EN */}
        <Text style={styles.label}>{productEnLabel}</Text>
        <TextInput
          value={productEn}
          onChangeText={setProductEn}
          placeholder={lang === "es" ? "ej. Coffee Beans" : "e.g. Coffee Beans"}
          placeholderTextColor={c.muted}
          style={styles.input}
        />

        {/* Product ES */}
        <Text style={styles.label}>{productEsLabel}</Text>
        <TextInput
          value={productEs}
          onChangeText={setProductEs}
          placeholder={lang === "es" ? "ej. Granos de café" : "e.g. Granos de café"}
          placeholderTextColor={c.muted}
          style={styles.input}
        />

        <Text style={styles.label}>{tt.origin}</Text>
        <TextInput
          value={origin}
          onChangeText={setOrigin}
          placeholder="e.g. Santa Ana, El Salvador"
          placeholderTextColor={c.muted}
          style={styles.input}
        />

        <Text style={styles.label}>{tt.harvestDate}</Text>
        <TextInput
          value={harvestDate}
          onChangeText={setHarvestDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>{tt.batch}</Text>
        <TextInput
          value={batch}
          onChangeText={setBatch}
          placeholder="e.g. BATCH-A1"
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>{tt.notesOptional}</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={lang === "es" ? "Opcional" : "Optional"}
          placeholderTextColor={c.muted}
          style={[styles.input, styles.notes]}
          multiline
        />

        <Pressable
          onPress={onSave}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
        >
          <Text style={styles.saveBtnText}>{tt.saveLot}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type ThemeColors = ReturnType<typeof getTheme>["colors"];
const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg, padding: 20 },

    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
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
    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

    content: { paddingBottom: 40 },

    title: { color: c.text, fontSize: 34, fontWeight: "900", letterSpacing: 1, marginTop: 2 },
    sub: { color: c.muted, marginTop: 6, marginBottom: 12, fontSize: 13, letterSpacing: 0.3 },

    label: { marginTop: 10, color: c.text, fontWeight: "900", letterSpacing: 0.4, fontSize: 12 },
    input: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      color: c.text,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 12,
      fontSize: 14,
      letterSpacing: 0.3,
    },
    notes: { minHeight: 90, textAlignVertical: "top" },

    saveBtn: {
      marginTop: 16,
      backgroundColor: c.green,
      borderColor: c.green,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      alignItems: "center",
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    saveBtnText: { color: "white", fontWeight: "900", letterSpacing: 0.6, fontSize: 14 },
  });

