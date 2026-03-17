export type InventorySnapshot = {
  stockQty: number;
  stockStatus: string;
};

export type ProductStockSnapshot = InventorySnapshot & {
  name: string;
  skuCode: string;
};

export type StoreReport = {
  storeName: string;
  availableProducts: ProductStockSnapshot[];
  unavailableProducts: ProductStockSnapshot[];
};

export type SlackMessageInput = {
  checkedAt: string;
  storeReports: StoreReport[];
};

export function hasStock(snapshot: InventorySnapshot): boolean {
  return snapshot.stockQty > 0 || snapshot.stockStatus !== "NO_STOCK";
}

export function findAvailableProducts(
  products: ProductStockSnapshot[],
): ProductStockSnapshot[] {
  return products.filter((product) => hasStock(product));
}

export function buildSlackMessage(input: SlackMessageInput): string {
  const hasAnyStock = input.storeReports.some(
    (storeReport) => storeReport.availableProducts.length > 0,
  );

  const sortedStoreReports = [...input.storeReports].sort((leftStoreReport, rightStoreReport) => {
    const leftHasStock = leftStoreReport.availableProducts.length > 0;
    const rightHasStock = rightStoreReport.availableProducts.length > 0;

    if (leftHasStock === rightHasStock) {
      return 0;
    }

    return leftHasStock ? -1 : 1;
  });

  const availableStoreLines = sortedStoreReports
    .filter((storeReport) => storeReport.availableProducts.length > 0)
    .map((storeReport) => {
      const allProducts = [
        ...storeReport.availableProducts,
        ...storeReport.unavailableProducts,
      ];

      const productSummary = allProducts
        .map((product) => {
          const shortName = product.name.includes("일반판") ? "일반판" : "마카세트";
          const stockLabel =
            product.stockQty > 0 ? `${product.stockQty}개` : "없음";

          return `${shortName} ${stockLabel}`;
        })
        .join(" | ");

      const storeLabel = storeReport.storeName
        .replace("트레이더스 홀세일 클럽 ", "")
        .replace("점", "");

      return `- ✅ ${storeLabel}: ${productSummary}`;
    })
    .join("\n\n");

  const unavailableStoreLabels = sortedStoreReports
    .filter((storeReport) => storeReport.availableProducts.length === 0)
    .map((storeReport) =>
      storeReport.storeName
        .replace("트레이더스 홀세일 클럽 ", "")
        .replace("점", ""),
    );

  const unavailableStoreLine =
    unavailableStoreLabels.length > 0
      ? `- ❌ ${unavailableStoreLabels.join(", ")}`
      : "";

  const storeLines = [availableStoreLines, unavailableStoreLine]
    .filter(Boolean)
    .join("\n\n");

  return hasAnyStock ? `@channel\n${storeLines}` : storeLines;
}
