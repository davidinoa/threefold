import handler, { createServerEntry } from "@tanstack/react-start/server-entry"

// The Worker's entry point. It wraps Start's own handler, so the security
// headers (system design §5.7) can be added to every response in one place.
export default createServerEntry({
  fetch(...args) {
    return handler.fetch(...args)
  },
})
