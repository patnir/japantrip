import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Link } from "@/app/types";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const LINKS_KEY = "links";

async function readLinks(): Promise<Link[]> {
  const links = await redis.get<Link[]>(LINKS_KEY);
  return links || [];
}

async function writeLinks(links: Link[]): Promise<void> {
  await redis.set(LINKS_KEY, links);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("deleted") === "true";
    
    const links = await readLinks();
    const filteredLinks = includeDeleted 
      ? links.filter(link => link.deleted === true)
      : links.filter(link => !link.deleted);
    
    filteredLinks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(filteredLinks);
  } catch (error) {
    console.error("Error reading links:", error);
    return NextResponse.json({ error: "Failed to read links" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const links = await readLinks();
    
    const newLink: Link = {
      id: crypto.randomUUID(),
      url: body.url,
      title: body.title || body.url,
      description: body.description || "",
      image: body.image || null,
      category: body.category || null,
      types: body.types || [],
      address: body.address || null,
      city: body.city || null,
      rating: body.rating || null,
      reviewCount: body.reviewCount || null,
      priceLevel: body.priceLevel || null,
      createdAt: new Date().toISOString(),
    };
    
    links.push(newLink);
    await writeLinks(links);
    
    return NextResponse.json(newLink, { status: 201 });
  } catch (error) {
    console.error("Error creating link:", error);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id, permanent } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const links = await readLinks();
    const linkIndex = links.findIndex((link) => link.id === id);
    
    if (linkIndex === -1) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    
    if (permanent) {
      // Permanently delete
      links.splice(linkIndex, 1);
    } else {
      // Soft delete
      links[linkIndex].deleted = true;
    }
    
    await writeLinks(links);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting link:", error);
    return NextResponse.json({ error: "Failed to delete link" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, restore, starred } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const links = await readLinks();
    const linkIndex = links.findIndex((link) => link.id === id);
    
    if (linkIndex === -1) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    
    if (restore) {
      links[linkIndex].deleted = false;
    }
    
    if (typeof starred === "boolean") {
      links[linkIndex].starred = starred;
    }
    
    await writeLinks(links);
    
    return NextResponse.json(links[linkIndex]);
  } catch (error) {
    console.error("Error updating link:", error);
    return NextResponse.json({ error: "Failed to update link" }, { status: 500 });
  }
}
