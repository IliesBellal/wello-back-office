import { describe, expect, it } from "vitest";
import { describeImageInput, isImageFile, pickedImageFile, pickedImageUrl, thumbnailUrl } from "./imageInput";

describe("imageInput", () => {
  it("distingue un fichier d'une image choisie par URL", () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    const picked = { imageUrl: "https://storage.welloresto.fr/wello_resto_images_storage/image_bank/pizzas/x.jpg" };
    expect(isImageFile(file)).toBe(true);
    expect(isImageFile(picked)).toBe(false);
    expect(pickedImageFile(file)).toBe(file);
    expect(pickedImageFile(picked)).toBeNull();
    expect(pickedImageUrl(picked)).toBe(picked.imageUrl);
    expect(pickedImageUrl(file)).toBeNull();
    expect(pickedImageUrl(null)).toBeNull();
    expect(describeImageInput(file)).toEqual({ fileName: "a.png", fileSize: 1 });
  });

  it("construit l'URL de miniature pour notre stockage seulement", () => {
    expect(thumbnailUrl("https://storage.welloresto.fr/wello_resto_images_storage/image_bank/pizzas/x.jpg")).toBe(
      "https://storage.welloresto.fr/cdn-cgi/image/width=400,format=auto/wello_resto_images_storage/image_bank/pizzas/x.jpg",
    );
    expect(thumbnailUrl("https://exemple.fr/x.jpg")).toBe("https://exemple.fr/x.jpg");
    const already = "https://storage.welloresto.fr/cdn-cgi/image/width=400/x.jpg";
    expect(thumbnailUrl(already)).toBe(already);
  });
});
