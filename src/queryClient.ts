import { QueryCache, QueryClient } from '@tanstack/react-query'
import { meQueryKey } from './features/auth/auth'
import { ApiError } from './shared/api/client'

/**
 * One rule for a session that ended: a 401 from any query means "log in again", so the cached answer
 * to "who is logged in" becomes `null`, and everything that reads it - the guard of the protected
 * routes among them - reacts.
 *
 * The login call is a mutation and `/me` answers 401 as a value, so neither can set this off by
 * itself; a wrong password stays on the login page, as it should.
 */
export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        queryClient.setQueryData(meQueryKey, null)
      }
    },
  }),
  defaultOptions: {
    queries: {
      // A 4xx will answer the same the second time. A dropped connection or a 5xx is worth one more.
      retry: (failureCount, error) =>
        failureCount < 1 &&
        !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
})
