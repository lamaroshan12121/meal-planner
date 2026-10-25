import { PRICES_CHECKED } from '../../../ingredients.js'
import { formatPriceDate } from '../lib/format.js'

export default function Notice() {
  return <p className="muted">Estimates only, not medical advice. Prices from ALDI, checked {formatPriceDate(PRICES_CHECKED)}.</p>
}
