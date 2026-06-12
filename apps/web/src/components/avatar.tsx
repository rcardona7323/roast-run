export default function Avatar({
  name,
  image,
  size,
  fontSize,
}: {
  name: string | null | undefined;
  image?: string | null;
  size: number;
  fontSize: number;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name ?? ""}
        referrerPolicy="no-referrer"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          border: "1px solid var(--border)",
        }}
      />
    );
  }
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="avatar-circle" style={{ width: size, height: size, fontSize, flexShrink: 0 }}>
      {initials}
    </div>
  );
}
