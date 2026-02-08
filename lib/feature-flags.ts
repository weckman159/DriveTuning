export function marketCommerceEnabled(): boolean {
  return (process.env.MARKET_COMMERCE_ENABLED || '').trim() === 'true'
}
