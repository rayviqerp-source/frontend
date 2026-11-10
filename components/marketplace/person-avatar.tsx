import { PersonPhoto } from "@/components/ui/person-photo";

/**
 * Marketplace avatar — thin wrapper over the shared `PersonPhoto` component so
 * the marketplace, the home page and the client app all show the same photo
 * for a given engineer id.
 */
export function PersonAvatar({
  id,
  name,
  className = "",
  backgroundColor,
}: {
  id: string;
  name: string;
  className?: string;
  backgroundColor?: string;
}) {
  return (
    <PersonPhoto
      id={id}
      name={name}
      className={className}
      backgroundColor={backgroundColor}
    />
  );
}
