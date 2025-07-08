'use client'

import { Star } from "lucide-react"
import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"
import { toggleContactFavorite } from "../../_lib/actions"
import { Button } from "@/components/ui/button"

export default function ContactFavorite({ contactId, isFavorite }: { contactId: string, isFavorite: boolean }) {
  const [optimisticFavorite, toggleOptimisticFavorite] = useOptimistic(
    isFavorite,
    (state) => !state
  )
  const [isPending, startTransition] = useTransition()

  const handleClick = async () => {
    startTransition(async () => {
      toggleOptimisticFavorite(isFavorite)
      const result = await toggleContactFavorite(contactId, optimisticFavorite)
      if (result?.error) {
        toast.error(result.error)
      }
    });
  }

  return (
    <Button 
      onClick={handleClick} 
      disabled={isPending} 
      variant="ghost"
      aria-label={optimisticFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      {optimisticFavorite ? (
        <Star className="size-5 fill-yellow-400 text-yellow-700 dark:text-yellow-400 dark:fill-yellow-900/30" strokeWidth={1} />
      ) : (
        <Star className="size-5 fill-gray-200 text-gray-400 dark:text-gray-400 dark:fill-gray-900/30" strokeWidth={1} />
      )}
    </Button>
  )
}