/**
 * The pastel colour a component request's status is shown in. Quiet tones, one per step: open is yellow, approved
 * blue-green, on its way blue, delivered purple, in stock - the last step, booked into the warehouse - sky blue; the two ways out are red (rejected) and orange
 * (called off). A status the page does not know is grey.
 */
export function requestStatusClass(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'badge bg-warning-subtle text-warning-emphasis'
    case 'APPROVED':
      return 'badge bg-info-subtle text-info-emphasis'
    case 'IN_TRANSIT':
      return 'badge bg-primary-subtle text-primary-emphasis'
    case 'DELIVERED':
      return 'badge badge-pastel-purple'
    case 'IN_STOCK':
      return 'badge badge-pastel-sky'
    case 'REJECTED':
      return 'badge bg-danger-subtle text-danger-emphasis'
    case 'CANCELLED':
      return 'badge badge-pastel-orange'
    default:
      return 'badge bg-secondary-subtle text-secondary-emphasis'
  }
}
