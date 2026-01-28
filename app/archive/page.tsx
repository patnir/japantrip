"use client";

import { useState, useEffect } from "react";
import { Link } from "../types";
import { Button } from "@/components/ui/button";
import { Loader2, Star, Undo2, Trash2, ArrowLeft } from "lucide-react";
import NextLink from "next/link";

export default function ArchivePage() {
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchArchivedLinks();
  }, []);

  const fetchArchivedLinks = async () => {
    try {
      const res = await fetch("/api/links?deleted=true");
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch (error) {
      console.error("Failed to fetch archived links:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch("/api/links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, restore: true }),
      });

      if (res.ok) {
        setLinks((prev) => prev.filter((link) => link.id !== id));
      }
    } catch (error) {
      console.error("Failed to restore link:", error);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      const res = await fetch("/api/links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, permanent: true }),
      });

      if (res.ok) {
        setLinks((prev) => prev.filter((link) => link.id !== id));
      }
    } catch (error) {
      console.error("Failed to permanently delete link:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-3 py-4">
        <div className="flex items-center gap-2 mb-3">
          <NextLink href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </NextLink>
          <h1 className="text-lg font-semibold">Archive</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No archived places
          </div>
        ) : (
          <div className="space-y-1">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-2 p-1.5 rounded-md border bg-card"
              >
                {link.image ? (
                  <div className="shrink-0 w-12 h-12 rounded overflow-hidden bg-muted">
                    <img
                      src={link.image}
                      alt=""
                      className="w-full h-full object-cover opacity-50"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="shrink-0 w-12 h-12 rounded bg-muted" />
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-xs leading-tight line-clamp-1 text-muted-foreground">
                    {link.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                    {link.category && <span className="line-clamp-1">{link.category}</span>}
                    {link.rating && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                        {link.rating}
                      </span>
                    )}
                  </div>
                  {link.city && <p className="text-[10px] text-muted-foreground">{link.city}</p>}
                </div>

                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => handleRestore(link.id)}
                    title="Restore"
                  >
                    <Undo2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handlePermanentDelete(link.id)}
                    title="Delete permanently"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
