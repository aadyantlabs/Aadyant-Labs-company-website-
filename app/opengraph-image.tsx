import { ogImage, ogSize } from "@/lib/og";

export const alt = "Aadyant Labs: We build websites people remember";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ theme: "solar", eyebrow: "Web design & development studio", title: "We build websites people remember" });
}
