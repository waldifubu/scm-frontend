import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, Outlet } from '@tanstack/react-router'
import { meQueryOptions } from '../auth/auth'
import { productsQueryOptions } from './products'
import { PRODUCT_SORT_KEYS, productColumns } from './productColumns'
import { hasRole } from '../../shared/api/types'
import { PageTitle } from '../../layout/PageTitle'
import { ServerTable } from '../../shared/ui/ServerTable'
import { listSort, useServerTableState } from '../../shared/lib/serverTable'
import { NewProductForm } from './NewProductForm'
import { DeleteProductButton } from './DeleteProductButton'
import { EditIcon } from '../categories/CategoryIcons'
import { NewRuleIcon, NewRuleToggle } from '../rules/RuleParts'
import { cell } from '../../shared/lib/format'

function ProductsTable() {
  const { pagination, sorting, setPagination, setSorting } = useServerTableState()
  const { data, isPending, isFetching, error } = useQuery({
    ...productsQueryOptions({
      page: pagination.pageIndex,
      size: pagination.pageSize,
      ...listSort(sorting, PRODUCT_SORT_KEYS),
    }),
    // The old page stays while the next one loads, so a click on a head does not empty the table.
    placeholderData: keepPreviousData,
  })
  const { data: user } = useQuery(meQueryOptions)
  const canEdit = user ? hasRole(user, 'ADMIN') || hasRole(user, 'MANAGER') : false

  return (
    <ServerTable
      columns={productColumns}
      data={data}
      isPending={isPending}
      isFetching={isFetching}
      error={error}
      loading="Loading products…"
      empty="No products."
      rowId={(product, index) => cell(product.articleNo) || String(index)}
      renderCell={(column, product) => (
        <Link
          to="/products/$articleNo"
          params={{ articleNo: cell(product.articleNo) }}
          className="text-decoration-none text-reset"
        >
          {cell(product[column])}
        </Link>
      )}
      trailing={
        canEdit
          ? {
              className: 'text-end',
              render: (product) => (
                <Link
                  to="/products/$articleNo/edit"
                  params={{ articleNo: cell(product.articleNo) }}
                  className="btn btn-sm d-inline-flex align-items-center gap-2"
                  // Filled for the product whose form is open below, as in the storehouses.
                  activeProps={{ className: 'btn-primary' }}
                  inactiveProps={{ className: 'btn-outline-primary' }}
                  aria-label={`Edit product ${cell(product.articleNo)}`}
                >
                  <EditIcon />
                  Edit
                </Link>
              ),
            }
          : undefined
      }
      pagination={pagination}
      sorting={sorting}
      onPagination={setPagination}
      onSorting={setSorting}
    />
  )
}

/** All products, as the backend lists them; the details of the chosen one render below. */
export function ProductsPage() {
  const { data: user } = useQuery(meQueryOptions)
  // `POST /products` is for admins and managers.
  const canCreate = user ? hasRole(user, 'ADMIN') || hasRole(user, 'MANAGER') : false
  return (
    <>
      <div className="card shadow-sm">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <PageTitle icon="products" className="me-auto">
            Products
          </PageTitle>
        </div>
        <ProductsTable />
      </div>
      <Outlet />
      {canCreate && (
        <NewRuleToggle
          label="New Product"
          formId="new-product-form"
          icon={<NewRuleIcon />}
          // `DELETE /products/{articleNo}` is open to the same roles as creating one.
          aside={<DeleteProductButton />}
        >
          {(close) => <NewProductForm onDone={close} />}
        </NewRuleToggle>
      )}
    </>
  )
}
