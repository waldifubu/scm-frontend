import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { meQueryOptions } from '../auth/auth'
import { categoriesQueryOptions, deleteCategory, type CategoryDto } from './categories'
import { CategoryForm } from './CategoryForm'
import { EditIcon, TrashIcon } from './CategoryIcons'
import { NewRuleIcon, NewRuleToggle } from '../rules/RuleParts'
import { DeleteWithConfirm } from '../../shared/ui/DeleteWithConfirm'
import { CATEGORY_SORT_KEYS, categoryColumns } from './categoryColumns'
import { hasRole } from '../../shared/api/types'
import { PageTitle } from '../../layout/PageTitle'
import { ServerTable } from '../../shared/ui/ServerTable'
import { listSort, useServerTableState } from '../../shared/lib/serverTable'
import { cell } from '../../shared/lib/format'

function CategoriesTable({
  editingId,
  onEdit,
  onDeleted,
}: {
  editingId: number | undefined
  onEdit: (category: CategoryDto) => void
  onDeleted: (id: number) => void
}) {
  const queryClient = useQueryClient()
  const { pagination, sorting, setPagination, setSorting } = useServerTableState()
  const { data, isPending, isFetching, error } = useQuery({
    ...categoriesQueryOptions({
      page: pagination.pageIndex,
      size: pagination.pageSize,
      ...listSort(sorting, CATEGORY_SORT_KEYS),
    }),
    placeholderData: keepPreviousData,
  })

  return (
    <ServerTable
      columns={categoryColumns}
      data={data}
      isPending={isPending}
      isFetching={isFetching}
      error={error}
      loading="Loading categories…"
      empty="No categories."
      rowId={(category) => String(category.id)}
      renderCell={(column, category) => cell(category[column as keyof typeof category])}
      trailing={{
        className: 'text-end text-nowrap',
        render: (category) => (
          <div className="d-inline-flex gap-2">
            <button
              type="button"
              className={`btn btn-sm d-inline-flex align-items-center gap-2 ${
                category.id === editingId ? 'btn-primary' : 'btn-outline-primary'
              }`}
              onClick={() => onEdit(category)}
            >
              <EditIcon />
              Edit
            </button>
            <DeleteWithConfirm
              title={`Delete category ${category.name}?`}
              icon={<TrashIcon />}
              onDelete={() => deleteCategory(category.id)}
              onDeleted={() => {
                onDeleted(category.id)
                void queryClient.invalidateQueries({ queryKey: ['categories'] })
              }}
            >
              <p className="mb-0">
                The category is removed for good. Not possible while a product is filed under it.
              </p>
            </DeleteWithConfirm>
          </div>
        ),
      }}
      pagination={pagination}
      sorting={sorting}
      onPagination={setPagination}
      onSorting={setSorting}
    />
  )
}

/** All product categories, to create, change and delete them; for admins only. */
export function CategoriesPage() {
  const { data: user } = useQuery(meQueryOptions)
  // The row that was chosen for editing, as it was when it was chosen.
  const [editing, setEditing] = useState<CategoryDto | null>(null)
  if (!user) return null
  if (!hasRole(user, 'ADMIN')) {
    return <p className="text-danger">Only admins may see the categories.</p>
  }

  return (
    <>
      <div className="card shadow-sm">
        <div className="card-body">
          <PageTitle icon="categories">Categories</PageTitle>
        </div>
        <CategoriesTable
          editingId={editing?.id}
          onEdit={setEditing}
          onDeleted={(id) => setEditing((current) => (current?.id === id ? null : current))}
        />
      </div>
      {editing && (
        <div className="card shadow-sm mt-4">
          <div className="card-body">
            <CategoryForm key={editing.id} category={editing} onClose={() => setEditing(null)} />
          </div>
        </div>
      )}
      <NewRuleToggle label="New Category" formId="new-category-form" icon={<NewRuleIcon />}>
        {(close) => <CategoryForm onClose={close} />}
      </NewRuleToggle>
    </>
  )
}
