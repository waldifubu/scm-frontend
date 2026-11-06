import {useQuery} from '@tanstack/react-query'
import {DEFAULT_ORDER_STATUS, ORDER_STATUSES, ordersQueryOptions, type OrderStatus} from '../api/orders'
import {Link, Outlet} from "@tanstack/react-router";
import { PageTitle } from './PageTitle'
import { Pager } from './Pager'
import { useState } from 'react'

function cell(value: unknown): string {
    if (value === null || value === undefined) return ''
    return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function OrdersTable({page, status, onPage}: {page: number; status: OrderStatus; onPage: (page: number) => void}) {
    const {data, isPending, error} = useQuery(ordersQueryOptions(page, status))

    if (isPending) return <p className="p-3 mb-0">Loading orders…</p>
    if (error) return <p className="p-3 mb-0 text-danger">{error.message}</p>
    const orders = data.content
    if (orders.length === 0) return <p className="p-3 mb-0 text-body-secondary">No orders in {status}.</p>

    const columns = [...new Set(orders.flatMap((order) => Object.keys(order)))]

    return (
        <>
        <div className="table-responsive">
            <table className="table table-striped table-responsive-md mb-0">
                <thead>
                <tr>
                    {columns.map((column) => (
                        <th key={column}>{column}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {orders.map((order, index) => (

                    <tr key={cell(order.id) || index}>
                        {columns.map((column) => (

                            <td key={column}>
                                <Link to="/orders/$orderNumber" params={{orderNumber: cell(order.orderNo)}}
                                      className="text-decoration-none text-reset">
                                    {cell(order[column])}
                                </Link>
                            </td>

                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
        <dl className="row justify-content-end small text-body-secondary px-2 mt-2 mb-2">
            <dd className="col-auto mb-0 me-auto">
                <Pager page={data.page} size={data.size} total={data.total} onPage={onPage}/>
            </dd>
            <dt className="col-auto">total</dt>
            <dd className="col-auto">{data.total}</dd>
            <dt className="col-auto">page</dt>
            <dd className="col-auto">{data.page}</dd>
            <dt className="col-auto">size</dt>
            <dd className="col-auto">{data.size}</dd>
        </dl>
        </>
    )
}

/** All orders, as the backend lists them; the details of the chosen one render below. */
export function OrdersPage() {
    const [page, setPage] = useState(0)
    const [status, setStatus] = useState<OrderStatus>(DEFAULT_ORDER_STATUS)
    return (
        <>
            <div className="card shadow-sm">
                <div className="card-body d-flex flex-wrap gap-2 align-items-center">
                    <PageTitle icon="orders" className="me-auto">Orders</PageTitle>
                    <select
                        className="form-select form-select-sm w-auto"
                        aria-label="Status"
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value as OrderStatus)
                            // Page 3 of one status says nothing about another.
                            setPage(0)
                        }}
                    >
                        {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>
                <OrdersTable page={page} status={status} onPage={setPage}/>
            </div>
            <Outlet/>
        </>
    )
}
