export type Lang = "en" | "es";

export const t = {
  en: {
    // global
    back: "Back",
    cancel: "Cancel",
    confirm: "Confirm",

    // modes
    client: "Client",
    operator: "Operator",
    enterOperator: "Enter Operator",
    exit: "Exit",
    enterOperatorPinTitle: "Enter Operator PIN",
    invalidPin: "Invalid PIN",
    pinMustBe4: "PIN must be 4 digits.",
    wrongPin: "Wrong PIN",
    tryAgain: "Try again.",
    operatorEnabled: "Operator enabled",
    nowOperator: "You now have operator permissions.",

    // catalog
    catalogTitle: "Catalog",
    catalogSub: "Click a lot to view details.",
    lotsCount: "lots",
    createLot: "Create Lot",
    delete: "Delete",
    deleteLotQ: "Delete lot?",
    deleteLotBody: "This will permanently remove",
    deleted: "Deleted",
    removedFromCatalog: "removed from catalog.",
    openDetailsHint: "Open Details →",

    // create lot
    createLotTitle: "Create Lot",
    createLotSub: "Fill fields and Save.",
    product: "Product",
    origin: "Origin",
    harvestDate: "Harvest Date",
    batch: "Batch",
    notesOptional: "Notes (optional)",
    saveLot: "Save Lot",
    missingFields: "Missing fields",
    fillRequired: "Please fill: Product, Origin, Harvest Date, Batch.",
    invalidDate: "Invalid date",
    dateFormatHint: "Use format YYYY-MM-DD (example: 2026-01-06).",
    saved: "Saved",
    lotCreated: "Lot created:",

    // lot details
    lotDetailsTitle: "Lot Details",
    missingLotId: "Missing lot id.",
    lotNotFound: "Lot not found:",
    copyId: "Copy ID",
    share: "Share",
    pinAction: "PIN Action",
    copied: "Copied",
    lotIdCopied: "Lot ID copied:",
    shareNotAvailable: "Share not available",
    copyInstead: "Copy the Lot ID instead.",
    enterPin: "Enter PIN",

    // verification
    verificationTitle: "Verification",
    verificationDesc:
      "This lot can be verified on-chain. (Next: Starknet hash + verification).",

    // ⭐ rating + reviews
    ratingTitle: "Rating",
    ratingDesc: "Tap a star to rate product quality.",
    yourRating: "Your rating",

    reviewsTitle: "Reviews",
    reviewPlaceholder: "Write a short comment…",
    submitReview: "Post Review",
    noReviewsYet: "No reviews yet.",
    reviewEmpty: "Please write a comment.",
    deleteReviewQ: "Delete review?",
    deleteReviewBody: "This will permanently remove the review.",

    // about
    aboutTitle: "About AgriTrace",
    aboutSubtitle: "Traceability you can verify — from origin to consumer.",
    aboutGoCatalog: "Open Catalog",

    aboutSectionWhatTitle: "What it is",
    aboutSectionWhatBody:
      "AgriTrace is a blockchain-based agricultural traceability platform that creates verifiable records for each product lot and makes them accessible through a QR code.",

    aboutSectionHowTitle: "How it works",
    aboutHow1: "A producer creates a lot (product + origin + harvest + batch).",
    aboutHow2: "AgriTrace generates a unique QR code for that lot.",
    aboutHow3: "Anyone can scan the QR to view the lot details.",
    aboutHow4: "Next step: verify integrity on Starknet (on-chain record).",

    aboutSectionWhyTitle: "Why blockchain / Starknet",
    aboutSectionWhyBody:
      "Blockchains make records tamper-resistant. Starknet provides scalability and low costs to support real-world adoption without pricing out small producers.",

    aboutSectionImpactTitle: "Impact",
    aboutImpact1: "Build consumer trust with transparent data.",
    aboutImpact2: "Help producers prove quality and unlock better markets.",
    aboutImpact3: "Enable supply chains to operate with a shared source of truth.",

    aboutTipWeb: "Tip: Use this page in demos so anyone understands AgriTrace fast.",
    aboutTipMobile: "Tip: Great for demos — clear explanation in one screen.",
  },

  es: {
    // global
    back: "Atrás",
    cancel: "Cancelar",
    confirm: "Confirmar",

    // modes
    client: "Cliente",
    operator: "Operador",
    enterOperator: "Entrar Operador",
    exit: "Salir",
    enterOperatorPinTitle: "PIN de Operador",
    invalidPin: "PIN inválido",
    pinMustBe4: "El PIN debe tener 4 dígitos.",
    wrongPin: "PIN incorrecto",
    tryAgain: "Intenta otra vez.",
    operatorEnabled: "Operador activado",
    nowOperator: "Ahora tienes permisos de operador.",

    // catalog
    catalogTitle: "Catálogo",
    catalogSub: "Haz clic en un lote para ver detalles.",
    lotsCount: "lotes",
    createLot: "Crear Lote",
    delete: "Borrar",
    deleteLotQ: "¿Borrar lote?",
    deleteLotBody: "Esto eliminará permanentemente",
    deleted: "Borrado",
    removedFromCatalog: "eliminado del catálogo.",
    openDetailsHint: "Abrir detalles →",

    // create lot
    createLotTitle: "Crear Lote",
    createLotSub: "Llena los campos y guarda.",
    product: "Producto",
    origin: "Origen",
    harvestDate: "Fecha de cosecha",
    batch: "Lote / Batch",
    notesOptional: "Notas (opcional)",
    saveLot: "Guardar Lote",
    missingFields: "Faltan campos",
    fillRequired: "Completa: Producto, Origen, Fecha de cosecha, Batch.",
    invalidDate: "Fecha inválida",
    dateFormatHint: "Usa formato YYYY-MM-DD (ej: 2026-01-06).",
    saved: "Guardado",
    lotCreated: "Lote creado:",

    // lot details
    lotDetailsTitle: "Detalles del lote",
    missingLotId: "Falta el id del lote.",
    lotNotFound: "Lote no encontrado:",
    copyId: "Copiar ID",
    share: "Compartir",
    pinAction: "Acción PIN",
    copied: "Copiado",
    lotIdCopied: "ID copiado:",
    shareNotAvailable: "Compartir no disponible",
    copyInstead: "Mejor copia el ID del lote.",
    enterPin: "Entrar PIN",

    // verification
    verificationTitle: "Verificación",
    verificationDesc:
      "Este lote se podrá verificar on-chain. (Próximo: hash y verificación en Starknet).",

    // ⭐ rating + reviews
    ratingTitle: "Calificación",
    ratingDesc: "Toca una estrella para calificar la calidad.",
    yourRating: "Tu calificación",

    reviewsTitle: "Comentarios",
    reviewPlaceholder: "Escribe un comentario corto…",
    submitReview: "Publicar",
    noReviewsYet: "Todavía no hay comentarios.",
    reviewEmpty: "Escribe un comentario.",
    deleteReviewQ: "¿Borrar comentario?",
    deleteReviewBody: "Esto eliminará permanentemente el comentario.",

    // about
    aboutTitle: "Acerca de AgriTrace",
    aboutSubtitle: "Trazabilidad verificable — del origen al consumidor.",
    aboutGoCatalog: "Abrir Catálogo",

    aboutSectionWhatTitle: "Qué es",
    aboutSectionWhatBody:
      "AgriTrace es una plataforma de trazabilidad agrícola basada en blockchain que crea registros verificables por lote y los hace accesibles mediante un código QR.",

    aboutSectionHowTitle: "Cómo funciona",
    aboutHow1: "El productor crea un lote (producto + origen + cosecha + batch).",
    aboutHow2: "AgriTrace genera un QR único para ese lote.",
    aboutHow3: "Cualquiera puede escanear el QR y ver los detalles.",
    aboutHow4: "Próximo paso: verificar integridad en Starknet (registro on-chain).",

    aboutSectionWhyTitle: "Por qué blockchain / Starknet",
    aboutSectionWhyBody:
      "Las blockchains hacen los registros difíciles de alterar. Starknet ofrece escalabilidad y costos bajos para adopción real sin excluir a productores pequeños.",

    aboutSectionImpactTitle: "Impacto",
    aboutImpact1: "Aumenta la confianza del consumidor con datos transparentes.",
    aboutImpact2: "Ayuda al productor a demostrar calidad y acceder a mejores mercados.",
    aboutImpact3: "Permite que la cadena de suministro opere con una sola fuente de verdad.",

    aboutTipWeb: "Tip: Usa esta pantalla en demos para explicar AgriTrace rápido.",
    aboutTipMobile: "Tip: Perfecta para demos — explicación clara en una pantalla.",
  },
} as const;
