import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import type { Schemas } from '../../shared/api/types'

/** `OrderWorkflowDiagramResponse`: the order workflow prepared for drawing - nodes, arrows, ends. */
export type OrderWorkflowDiagram = Schemas['OrderWorkflowDiagramResponse']

/**
 * `GET /orders/workflow/diagram`. What the backend's workflow table says never changes while the app runs, so it is
 * asked once. SUPPLIER and DISTRIBUTOR get a 403 there: no retries, the static diagram simply stays.
 */
export const orderWorkflowDiagramQueryOptions = () =>
  queryOptions({
    queryKey: ['order-workflow-diagram'],
    queryFn: () => api<OrderWorkflowDiagram>('/orders/workflow/diagram'),
    staleTime: Infinity,
    retry: false,
  })

/** `OrderWorkflowResponse`: the whole workflow table - every step with who takes it and how. */
export type OrderWorkflow = Schemas['OrderWorkflowResponse']

/**
 * `GET /orders/workflow`. Like the diagram it never changes while the app runs. Every role that reads orders may
 * ask; where it is refused the page offers no action buttons (the backend would refuse them as well).
 */
export const orderWorkflowQueryOptions = () =>
  queryOptions({
    queryKey: ['order-workflow'],
    queryFn: () => api<OrderWorkflow>('/orders/workflow'),
    staleTime: Infinity,
    retry: false,
  })
