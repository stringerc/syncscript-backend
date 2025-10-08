import db from '../utils/database';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  energy_requirement?: number;
  priority: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProjectData {
  user_id: string;
  name: string;
  description?: string;
  color?: string;
  energy_requirement?: number;
  priority?: number;
}

export class ProjectModel {
  // Create project
  static async create(data: CreateProjectData): Promise<Project> {
    const query = `
      INSERT INTO projects (
        user_id, name, description, color, energy_requirement, priority
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    return await db.one(query, [
      data.user_id,
      data.name,
      data.description || null,
      data.color || '#6366f1',
      data.energy_requirement || null,
      data.priority || 3
    ]);
  }

  // Get project by ID
  static async findById(id: string, userId: string): Promise<Project | null> {
    try {
      return await db.one(
        'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
    } catch (error) {
      return null;
    }
  }

  // Get all user projects
  static async getUserProjects(
    userId: string,
    status?: string,
    limit = 100,
    offset = 0
  ): Promise<Project[]> {
    let query = 'SELECT * FROM projects WHERE user_id = $1';
    const params: any[] = [userId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
      query += ' ORDER BY priority DESC, created_at DESC LIMIT $3 OFFSET $4';
      params.push(limit, offset);
    } else {
      query += ' ORDER BY priority DESC, created_at DESC LIMIT $2 OFFSET $3';
      params.push(limit, offset);
    }

    return await db.any(query, params);
  }

  // Update project
  static async update(id: string, userId: string, data: Partial<CreateProjectData>): Promise<Project> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(data.name);
      paramCount++;
    }

    if (data.description !== undefined) {
      fields.push(`description = $${paramCount}`);
      values.push(data.description);
      paramCount++;
    }

    if (data.color !== undefined) {
      fields.push(`color = $${paramCount}`);
      values.push(data.color);
      paramCount++;
    }

    if (data.energy_requirement !== undefined) {
      fields.push(`energy_requirement = $${paramCount}`);
      values.push(data.energy_requirement);
      paramCount++;
    }

    if (data.priority !== undefined) {
      fields.push(`priority = $${paramCount}`);
      values.push(data.priority);
      paramCount++;
    }

    values.push(id, userId);

    const query = `
      UPDATE projects
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING *
    `;

    return await db.one(query, values);
  }

  // Archive project (soft delete)
  static async archive(id: string, userId: string): Promise<Project> {
    return await db.one(
      `UPDATE projects SET status = 'archived' WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
  }

  // Delete project
  static async delete(id: string, userId: string): Promise<boolean> {
    const result = await db.result(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rowCount > 0;
  }

  // Get project with task count
  static async getProjectWithStats(id: string, userId: string): Promise<any> {
    const query = `
      SELECT 
        p.*,
        COUNT(t.id) FILTER (WHERE t.status = 'pending') as pending_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
        SUM(t.points) FILTER (WHERE t.status = 'completed') as total_points
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.id = $1 AND p.user_id = $2
      GROUP BY p.id
    `;

    try {
      return await db.one(query, [id, userId]);
    } catch (error) {
      return null;
    }
  }
}
