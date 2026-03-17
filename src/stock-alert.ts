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

  const storeLines = input.storeReports
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

      return [
        storeReport.availableProducts.length > 0 ? `- ${storeLabel} 재고 있음` : `- ${storeLabel}`,
        `  ${productSummary}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    hasAnyStock ? "@channel :rotating_light: 트레이더스 스위치2 재고 감지" : ":eyes: 트레이더스 스위치2 재고 현황",
    `조회 시각: ${input.checkedAt}`,
    "",
    storeLines,
  ].join("\n");
}
