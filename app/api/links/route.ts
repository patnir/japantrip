import { NextRequest, NextResponse } from "next/server";
import { put, head } from "@vercel/blob";
import { Link } from "@/app/types";

const BLOB_KEY = "links.json";

async function readLinks(): Promise<Link[]> {
  try {
    const blob = await head(BLOB_KEY);
    if (!blob) return [];
    
    const response = await fetch(blob.url);
    const data = await response.json();
    return data.links || [];
  } catch {
    return [];
  }
}

async function writeLinks(links: Link[]): Promise<void> {
  await put(BLOB_KEY, JSON.stringify({ links }, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function GET() {
  try {
    const links = await readLinks();
    links.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(links);
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
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const links = await readLinks();
    const filteredLinks = links.filter((link) => link.id !== id);
    
    if (filteredLinks.length === links.length) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    
    await writeLinks(filteredLinks);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting link:", error);
    return NextResponse.json({ error: "Failed to delete link" }, { status: 500 });
  }
}
