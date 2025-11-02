import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type Lining = { id: string; name: string; price: number };
const file = path.join(process.cwd(), "data", "linings.json");

const read = async (): Promise<Lining[]> => JSON.parse(await fs.readFile(file, "utf8"));
const write = async (d: Lining[]) => fs.writeFile(file, JSON.stringify(d, null, 2), "utf8");

export async function GET() {
  try { return NextResponse.json({ success: true, data: await read() }); }
  catch (e: any) { return NextResponse.json({ success: false, error: e?.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Lining>;
    if (!body.id || !body.name) return NextResponse.json({ success:false, error:"id and name required" }, { status:400 });
    const list = await read();
    if (list.some(x=>x.id===body.id)) return NextResponse.json({ success:false, error:"exists" }, { status:409 });
    const item: Lining = { id: body.id, name: body.name, price: Number(body.price ?? 0) };
    list.push(item); await write(list);
    return NextResponse.json({ success: true, data: item });
  } catch (e: any) {
    return NextResponse.json({ success:false, error:e?.message }, { status:500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Partial<Lining> & { id: string };
    if (!body.id) return NextResponse.json({ success:false, error:"id required" }, { status:400 });
    const list = await read();
    const idx = list.findIndex(x=>x.id===body.id);
    if (idx===-1) return NextResponse.json({ success:false, error:"not found" }, { status:404 });
    const upd: Lining = { ...list[idx], ...body, price: Number(body.price ?? list[idx].price ?? 0) } as Lining;
    list[idx]=upd; await write(list);
    return NextResponse.json({ success:true, data: upd });
  } catch (e: any) {
    return NextResponse.json({ success:false, error:e?.message }, { status:500 });
  }
}

