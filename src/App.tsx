// Bootstrap, once and for everything: the stylesheet is global, so it is loaded here at the top of the
// application rather than by whichever page happens to need it first. Its JavaScript is not used.
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from './queryClient'
import { router } from './router'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export default App
