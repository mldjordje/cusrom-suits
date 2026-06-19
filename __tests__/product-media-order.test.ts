import { describe, expect, it } from "vitest";
import {
  parseProductMediaOrder,
  resolveProductMediaOrder,
  type ProductMediaItem,
} from "@/lib/catalog/productMediaOrder";

describe("resolveProductMediaOrder", () => {
  const images = ["/one.jpg", "/two.jpg", "/three.jpg"];

  it("keeps the legacy video-then-images order when no custom order exists", () => {
    expect(resolveProductMediaOrder(images, "/clip.mp4", [])).toEqual([
      { kind: "video", src: "/clip.mp4" },
      { kind: "image", src: "/one.jpg" },
      { kind: "image", src: "/two.jpg" },
      { kind: "image", src: "/three.jpg" },
    ]);
  });

  it("supports an arbitrary image and video sequence", () => {
    const order: ProductMediaItem[] = [
      { kind: "image", src: "/one.jpg" },
      { kind: "image", src: "/two.jpg" },
      { kind: "video", src: "/clip.mp4" },
      { kind: "image", src: "/three.jpg" },
    ];

    expect(resolveProductMediaOrder(images, "/clip.mp4", order)).toEqual(order);
  });

  it("drops stale and duplicate entries then appends newly added media", () => {
    expect(resolveProductMediaOrder(images, "/new-clip.mp4", [
      { kind: "image", src: "/two.jpg" },
      { kind: "image", src: "/deleted.jpg" },
      { kind: "image", src: "/two.jpg" },
      { kind: "video", src: "/old-clip.mp4" },
    ])).toEqual([
      { kind: "image", src: "/two.jpg" },
      { kind: "video", src: "/new-clip.mp4" },
      { kind: "image", src: "/one.jpg" },
      { kind: "image", src: "/three.jpg" },
    ]);
  });
});

describe("parseProductMediaOrder", () => {
  it("accepts only unique image/video entries with non-empty sources", () => {
    expect(parseProductMediaOrder([
      { kind: "image", src: " /one.jpg " },
      { kind: "audio", src: "/sound.mp3" },
      { kind: "video", src: "" },
      { kind: "image", src: "/one.jpg" },
      null,
    ])).toEqual([{ kind: "image", src: "/one.jpg" }]);
  });
});
