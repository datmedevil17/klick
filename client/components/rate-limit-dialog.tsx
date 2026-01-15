"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface RateLimitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RateLimitDialog({ open, onOpenChange }: RateLimitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Oops! Rate limit reached</DialogTitle>
          <DialogDescription>
            You've hit the rate limit for this demo. Don't worry though! 
            You can fork this template and set up your own API keys to continue chatting.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-2">
          <Button
            asChild
            variant="default"
            className="w-full"
          >
            <a
              href="https://v0.app/templates/3-d-keyboard-chat-JTMkCmk0GvC?ref=GA088G"
              target="_blank"
              rel="noopener noreferrer"
            >
              Fork on v0
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
