"use client";

import { useState, useEffect, useMemo } from "react";
import { Link, getCategoryGroup } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { X, Loader2, Star as StarIcon, Copy, Check, Trash2 } from "lucide-react";
import NextLink from "next/link";

export default function Home() {
  const [links, setLinks] = useState<Link[]>([]);
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [urlError, setUrlError] = useState<string | null>(null);

  const isGoogleMapsUrl = (url: string) => {
    return url.includes("google.com/maps") || url.includes("maps.app.goo.gl") || url.includes("goo.gl/maps");
  };

  const cities = useMemo(() => {
    const citySet = new Set<string>();
    links.forEach((link) => {
      if (link.city) citySet.add(link.city);
    });
    return Array.from(citySet).sort();
  }, [links]);

  const categoryGroups = useMemo(() => {
    const groups = new Set<string>();
    links.forEach((link) => {
      groups.add(getCategoryGroup(link.types, link.category));
    });
    return Array.from(groups).sort();
  }, [links]);

  const filteredLinks = useMemo(() => {
    const filtered = links.filter((link) => {
      const cityMatch = selectedCity === "all" || link.city === selectedCity;
      const categoryMatch = selectedCategory === "all" || getCategoryGroup(link.types, link.category) === selectedCategory;
      return cityMatch && categoryMatch;
    });
    // Sort starred items to the top
    return filtered.sort((a, b) => {
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      return 0;
    });
  }, [links, selectedCity, selectedCategory]);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const res = await fetch("/api/links");
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch (error) {
      console.error("Failed to fetch links:", error);
    } finally {
      setIsPageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    if (!isGoogleMapsUrl(url)) {
      setUrlError("Only Google Maps links are allowed");
      return;
    }

    setUrlError(null);
    setIsLoading(true);

    try {
      const metadataRes = await fetch("/api/fetch-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      let metadata = {
        title: url,
        description: "",
        image: null,
        category: null,
        types: [] as string[],
        address: null,
        city: null,
        rating: null,
        reviewCount: null,
        priceLevel: null,
      };
      if (metadataRes.ok) {
        metadata = await metadataRes.json();
      }

      const saveRes = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, ...metadata }),
      });

      if (saveRes.ok) {
        const newLink = await saveRes.json();
        setLinks((prev) => [newLink, ...prev]);
        setUrl("");
      }
    } catch (error) {
      console.error("Failed to add link:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setLinks((prev) => prev.filter((link) => link.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete link:", error);
    }
  };

  const handleCopy = async (linkUrl: string, id: string) => {
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleStar = async (id: string, currentStarred: boolean) => {
    try {
      const res = await fetch("/api/links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, starred: !currentStarred }),
      });

      if (res.ok) {
        setLinks((prev) =>
          prev.map((link) =>
            link.id === id ? { ...link, starred: !currentStarred } : link
          )
        );
      }
    } catch (error) {
      console.error("Failed to star link:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-3 py-4">
        <h1 className="text-lg font-semibold text-center mb-3">Carolyn and Rahul Go To Japan</h1>

        <form onSubmit={handleSubmit} className="mb-3">
          <div className="flex gap-1.5">
            <Input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlError(null);
              }}
              placeholder="Paste a Google Maps link..."
              className={`flex-1 h-8 text-sm ${urlError ? "border-red-500" : ""}`}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !url.trim()} size="sm" className="h-8 px-3">
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
            </Button>
          </div>
          {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
        </form>

        {links.length > 0 && (
          <div className="flex items-center gap-2 mb-2 overflow-x-auto">
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="h-7 w-auto min-w-[90px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ToggleGroup
              type="single"
              value={selectedCategory}
              onValueChange={(value) => value && setSelectedCategory(value)}
              size="sm"
              className="gap-1"
            >
              <ToggleGroupItem value="all" className="text-xs h-7 px-2.5 rounded-full">
                All
              </ToggleGroupItem>
              {categoryGroups.map((group) => (
                <ToggleGroupItem key={group} value={group} className="text-xs h-7 px-2.5 rounded-full">
                  {group}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}

        {links.length > 0 && (
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">
              {filteredLinks.length} {filteredLinks.length === 1 ? "place" : "places"}
            </p>
            <NextLink href="/archive" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Trash2 className="h-3 w-3" />
              Archive
            </NextLink>
          </div>
        )}

        {isPageLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No links saved yet
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No matches
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLinks.map((link) => (
              <div
                key={link.id}
                className="group flex items-center gap-2 p-1.5 rounded-md border bg-card hover:bg-muted/50 transition-colors"
              >
                {link.image ? (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 w-12 h-12 rounded overflow-hidden bg-muted"
                  >
                    <img
                      src={link.image}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </a>
                ) : (
                  <div className="shrink-0 w-12 h-12 rounded bg-muted" />
                )}

                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0"
                >
                  <h3 className="font-medium text-xs leading-tight line-clamp-1">{link.title}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                    {link.category && <span className="line-clamp-1">{link.category}</span>}
                    {link.rating && (
                      <span className="flex items-center gap-0.5">
                        <StarIcon className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                        {link.rating}
                      </span>
                    )}
                    {link.priceLevel && <span>{link.priceLevel}</span>}
                  </div>
                  {link.city && <p className="text-[10px] text-muted-foreground">{link.city}</p>}
                </a>

                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleStar(link.id, !!link.starred)}
                  >
                    <StarIcon className={`h-3 w-3 ${link.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleCopy(link.url, link.id)}
                  >
                    {copiedId === link.id ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:bg-destructive hover:text-white"
                    onClick={() => handleDelete(link.id)}
                  >
                    <X className="h-3 w-3" />
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
