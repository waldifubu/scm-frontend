import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMatch, useNavigate } from '@tanstack/react-router'
import { deleteProduct, productBySkuQueryOptions, productQueryOptions } from './products'
import { TrashIcon } from '../categories/CategoryIcons'
import { DeleteWithConfirm } from '../../shared/ui/DeleteWithConfirm'
import { cell } from '../../shared/lib/format'

/**
 * Deletes the product whose details are open, after asking; nothing without one. It reads the same query as the
 * details, so it appears once they have arrived.
 */
export function DeleteProductButton() {
  const byNumber = useMatch({ from: '/authed/products/$articleNo', shouldThrow: false })
  const bySku = useMatch({ from: '/authed/products/sku/$sku', shouldThrow: false })
  const articleNo = byNumber?.params.articleNo
  const sku = bySku?.params.sku
  const numbered = useQuery({
    ...productQueryOptions(articleNo ?? ''),
    enabled: articleNo !== undefined,
  })
  const skuProduct = useQuery({
    ...productBySkuQueryOptions(sku ?? ''),
    enabled: sku !== undefined,
  })
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const product =
    articleNo !== undefined ? numbered.data : sku !== undefined ? skuProduct.data : undefined
  const number = product?.articleNo
  if (typeof number !== 'number') return null

  return (
    <DeleteWithConfirm
      title={`Delete product ${cell(product?.name)}?`}
      icon={<TrashIcon />}
      small={false}
      onDelete={() => deleteProduct(number)}
      onDeleted={async () => {
        // Leave the details first: reading the deleted product again would only be a 404.
        await navigate({ to: '/products' })
        queryClient.removeQueries({ queryKey: ['products', String(number)] })
        await queryClient.invalidateQueries({ queryKey: ['products'] })
      }}
    >
      <p className="mb-0">
        Product {number} and its bill of materials are removed for good. Not possible while an order
        or stock still names it.
      </p>
    </DeleteWithConfirm>
  )
}
