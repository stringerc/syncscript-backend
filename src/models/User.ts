import db from '../utils/database';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  timezone: string;
  energy_pattern: any;
  preferences: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  name: string;
  avatar_url?: string;
  timezone?: string;
}

export class UserModel {
  // Create a new user
  static async create(data: CreateUserData): Promise<User> {
    const query = `
      INSERT INTO users (email, name, avatar_url, timezone)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    return await db.one(query, [
      data.email,
      data.name,
      data.avatar_url || null,
      data.timezone || 'UTC'
    ]);
  }

  // Find user by ID
  static async findById(id: string): Promise<User | null> {
    try {
      return await db.one('SELECT * FROM users WHERE id = $1', [id]);
    } catch (error) {
      return null;
    }
  }

  // Find user by email
  static async findByEmail(email: string): Promise<User | null> {
    try {
      return await db.one('SELECT * FROM users WHERE email = $1', [email]);
    } catch (error) {
      return null;
    }
  }

  // Update user
  static async update(id: string, data: Partial<CreateUserData>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(data.name);
      paramCount++;
    }

    if (data.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramCount}`);
      values.push(data.avatar_url);
      paramCount++;
    }

    if (data.timezone !== undefined) {
      fields.push(`timezone = $${paramCount}`);
      values.push(data.timezone);
      paramCount++;
    }

    values.push(id);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    return await db.one(query, values);
  }

  // Get all users (admin)
  static async findAll(limit = 100, offset = 0): Promise<User[]> {
    return await db.any(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
  }

  // Delete user
  static async delete(id: string): Promise<boolean> {
    const result = await db.result('DELETE FROM users WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
}
