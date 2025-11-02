import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type Fabric = {
  id: string;
  name: string;
  price: number;
  tone?: "light" | "medium" | "dark";
  description?: string;
  texture: string;
  zoom1?: string;
  zoom2?: string;
};

const dataFile = path.join(process.cwd(), "data", "fabrics.json");

async function readFabrics(): Promise<Fabric[]> {
  const raw = await fs.readFile(dataFile, "utf-8");
  return JSON.parse(raw);
}

async function writeFabrics(list: Fabric[]) {
  await fs.writeFile(dataFile, JSON.stringify(list, null, 2), "utf-8");
}

export async function GET() {
  try {
    const data = await readFabrics();
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? "Failed to read fabrics" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Fabric>;
    if (!body.id || !body.name || !body.texture) {
      return NextResponse.json(
        { success: false, error: "id, name, texture are required" },
        { status: 400 }
      );
    }
    const list = await readFabrics();
    if (list.some((f) => f.id === body.id)) {
      return NextResponse.json(
        { success: false, error: "Fabric with this id already exists" },
        { status: 409 }
      );
    }
    const item: Fabric = {
      id: body.id,
      name: body.name,
      texture: body.texture,
      price: Number(body.price ?? 0),
      tone: (body.tone as any) ?? "medium",
      description: body.description ?? "",
      zoom1: body.zoom1 ?? body.texture,
      zoom2: body.zoom2 ?? body.texture,
    };
    list.push(item);
    await writeFabrics(list);
    return NextResponse.json({ success: true, data: item });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? "Failed to add fabric" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Partial<Fabric> & { id: string };
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }
    const list = await readFabrics();
    const idx = list.findIndex((f) => f.id === body.id);
    if (idx === -1) {
      return NextResponse.json(
        { success: false, error: "Fabric not found" },
        { status: 404 }
      );
    }
    const updated: Fabric = {
      ...list[idx],
      ...body,
      price: Number(body.price ?? list[idx].price ?? 0),
    } as Fabric;
    list[idx] = updated;
    await writeFabrics(list);
    return NextResponse.json({ success: true, data: updated });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? "Failed to update fabric" },
      { status: 500 }
    );
  }
}

