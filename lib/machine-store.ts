export interface Machine {
  id?: number
  value: string
  label: string
  route?: string
}

export async function getMachines(): Promise<Machine[]> {
  try {
    const response = await fetch("/api/machines", { cache: "no-store" })
    if (!response.ok) throw new Error("Failed to fetch machines")
    return response.json()
  } catch (error) {
    console.error("Error fetching machines:", error)
    return []
  }
}

export async function createMachine(
  machine: Omit<Machine, "id">
): Promise<Machine | null> {
  try {
    const response = await fetch("/api/machines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(machine),
    })
    if (!response.ok) throw new Error("Failed to create machine")
    return response.json()
  } catch (error) {
    console.error("Error creating machine:", error)
    return null
  }
}

export async function updateMachine(machine: Machine): Promise<Machine | null> {
  try {
    const response = await fetch("/api/machines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(machine),
    })
    if (!response.ok) throw new Error("Failed to update machine")
    return response.json()
  } catch (error) {
    console.error("Error updating machine:", error)
    return null
  }
}

export async function deleteMachine(id: number): Promise<boolean> {
  try {
    const response = await fetch(`/api/machines?id=${id}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Failed to delete machine")
    return true
  } catch (error) {
    console.error("Error deleting machine:", error)
    return false
  }
}
