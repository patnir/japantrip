"use client";

import { useState, useEffect, useMemo } from "react";
import { Link, getCategoryGroup } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Loader2, Star, Copy, Check } from "lucide-react";

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

  // Get unique cities and categories from links
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

  // Filter links
  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      const cityMatch = selectedCity === "all" || link.city === selectedCity;
      const categoryMatch = selectedCategory === "all" || getCategoryGroup(link.types, link.category) === selectedCategory;
      return cityMatch && categoryMatch;
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-3 py-6 sm:py-10">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Japan Trip</h1>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-2">
            <Input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlError(null);
              }}
              placeholder="Paste a Google Maps link..."
              className={`flex-1 h-10 ${urlError ? "border-red-500" : ""}`}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !url.trim()} className="h-10 px-4">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </div>
          {urlError && (
            <p className="text-sm text-red-500 mt-1">{urlError}</p>
          )}
        </form>

        {/* Filters */}
        {links.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {/* City filter */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="h-9 px-3 text-sm border rounded-lg bg-background min-w-[100px]"
            >
              <option value="all">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>

            {/* Category filter as pills */}
            <div className="flex gap-1.5">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                All
              </button>
              {categoryGroups.map((group) => (
                <button
                  key={group}
                  onClick={() => setSelectedCategory(group)}
                  className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === group
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Count */}
        {links.length > 0 && (
          <p className="text-xs text-muted-foreground mb-3">
            {filteredLinks.length} {filteredLinks.length === 1 ? "place" : "places"}
          </p>
        )}

        {/* Links */}
        {isPageLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No links saved yet</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No matches</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLinks.map((link) => (
              <div
                key={link.id}
                className="group flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                {/* Thumbnail */}
                {link.image ? (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 w-16 h-16 rounded-md overflow-hidden bg-muted"
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
                  <div className="shrink-0 w-16 h-16 rounded-md bg-muted" />
                )}

                {/* Content */}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0"
                >
                  <h3 className="font-medium text-sm leading-tight line-clamp-1">
                    {link.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    {link.category && (
                      <span className="line-clamp-1">{link.category}</span>
                    )}
                    {link.rating && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {link.rating}
                      </span>
                    )}
                    {link.priceLevel && <span>{link.priceLevel}</span>}
                  </div>
                  {link.city && (
                    <p className="text-xs text-muted-foreground mt-0.5">{link.city}</p>
                  )}
                </a>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(link.url, link.id)}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  >
                    {copiedId === link.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-1.5 rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
