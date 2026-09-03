"use server";

import db from "../db";
import { revalidatePath } from "next/cache";

export async function getJewelryMaterials() {
    try {
        const materials = await db.jewelryMaterial.findMany({
            orderBy: { name: "asc" },
        });
        return { success: true, data: materials };
    } catch (error) {
        console.error("Error fetching jewelry materials:", error);
        return { success: false, error: "Error al obtener materiales de joyería" };
    }
}

export async function createJewelryMaterial(name: string) {
    try {
        const material = await db.jewelryMaterial.create({
            data: { name },
        });
        revalidatePath("/jewelry/inventory");
        revalidatePath("/jewelry/production");
        revalidatePath("/settings");
        return { success: true, data: material };
    } catch (error: any) {
        console.error("Error creating jewelry material:", error);
        if (error.code === "P2002") {
            return { success: false, error: "Este material ya existe" };
        }
        return { success: false, error: "Error al crear material" };
    }
}

export async function updateJewelryMaterial(id: string, name: string) {
    try {
        const material = await db.jewelryMaterial.update({
            where: { id },
            data: { name },
        });
        revalidatePath("/jewelry/inventory");
        revalidatePath("/jewelry/production");
        revalidatePath("/settings");
        return { success: true, data: material };
    } catch (error: any) {
        console.error("Error updating jewelry material:", error);
        if (error.code === "P2002") {
            return { success: false, error: "Ese nombre ya existe" };
        }
        return { success: false, error: "Error al actualizar material" };
    }
}

export async function deleteJewelryMaterial(id: string) {
    try {
        await db.jewelryMaterial.delete({
            where: { id },
        });
        revalidatePath("/jewelry/inventory");
        revalidatePath("/jewelry/production");
        revalidatePath("/settings");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting jewelry material:", error);
        return { success: false, error: "Error al eliminar material. Asegúrese que no esté en uso." };
    }
}
