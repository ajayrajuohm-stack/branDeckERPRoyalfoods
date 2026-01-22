import { db } from "./db";
import { categories, unitsOfMeasure } from "@shared/schema";
import { eq } from "drizzle-orm";

export const storage = {

  // ===== Categories =====
  async getCategories() {
    try {
      return await db.select().from(categories);
    } catch (err) {
      console.error("Error fetching categories:", err);
      throw err;
    }
  },

  async createCategory(data: any) {
    try {
      const [result] = await db.insert(categories).values({
        name: data.name,
        type: data.type ?? "RAW",
      });
      const [inserted] = await db.select().from(categories).where(eq(categories.id, result.insertId));
      return inserted;
    } catch (err) {
      console.error("Error creating category:", err);
      throw err;
    }
  },

  async updateCategory(id: number, data: any) {
    try {
      await db.update(categories)
        .set(data)
        .where(eq(categories.id, id));
      const [updated] = await db.select().from(categories).where(eq(categories.id, id));
      if (!updated) {
        throw new Error("Category not found");
      }
      return updated;
    } catch (err) {
      console.error("Error updating category:", err);
      throw err;
    }
  },

  async deleteCategory(id: number) {
    try {
      await db.delete(categories).where(eq(categories.id, id));
    } catch (err) {
      console.error("Error deleting category:", err);
      throw err;
    }
  },

  // ===== UOMS =====
  async getUoms() {
    try {
      return await db.select().from(unitsOfMeasure);
    } catch (err) {
      console.error("Error fetching UOMs:", err);
      throw err;
    }
  },

  async createUom(data: any) {
    try {
      const [result] = await db.insert(unitsOfMeasure).values(data);
      const [inserted] = await db.select().from(unitsOfMeasure).where(eq(unitsOfMeasure.id, result.insertId));
      return inserted;
    } catch (err) {
      console.error("Error creating UOM:", err);
      throw err;
    }
  },

  async deleteUom(id: number) {
    try {
      await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, id));
    } catch (err) {
      console.error("Error deleting UOM:", err);
      throw err;
    }
  },
};
