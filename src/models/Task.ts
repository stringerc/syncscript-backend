import db from '../utils/database';

export interface Tag {
  id: string;
  label: string;
  color: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id?: string;
  title: string;
  description?: string;
  energy_requirement: number;
  priority: number;
  status: string;
  due_date?: Date;
  completed_at?: Date;
  estimated_duration?: number;
  actual_duration?: number;
  points: number;
  tags?: Tag[];
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskData {
  user_id: string;
  project_id?: string;
  title: string;
  description?: string;
  energy_requirement?: number;
  priority?: number;
  due_date?: Date;
  estimated_duration?: number;
  tags?: Tag[];
}

export interface TaskWithEnergyMatch extends Task {
  energy_match: boolean;
  energy_match_score: number;
  bonus_points: number;
}

export class TaskModel {
  // Create task
  static async create(data: CreateTaskData): Promise<Task> {
    const query = `
      INSERT INTO tasks (
        user_id, project_id, title, description,
        energy_requirement, priority, due_date, estimated_duration, points, tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    // Calculate base points from priority and energy requirement
    const basePoints = this.calculateBasePoints(
      data.priority || 3,
      data.energy_requirement || 3
    );

    return await db.one(query, [
      data.user_id,
      data.project_id || null,
      data.title,
      data.description || null,
      data.energy_requirement || 3,
      data.priority || 3,
      data.due_date || null,
      data.estimated_duration || null,
      basePoints,
      JSON.stringify(data.tags || [])
    ]);
  }

  // Calculate base points
  private static calculateBasePoints(priority: number, energyRequirement: number): number {
    const priorityMultiplier = {
      1: 10,
      2: 20,
      3: 40,
      4: 80,
      5: 150
    }[priority] || 40;

    const energyMultiplier = {
      1: 0.5,
      2: 0.75,
      3: 1.0,
      4: 1.25,
      5: 1.5
    }[energyRequirement] || 1.0;

    return Math.round(priorityMultiplier * energyMultiplier);
  }

  // Get tasks with energy matching
  static async getTasksWithEnergyMatch(
    userId: string,
    currentEnergyLevel: number,
    filters?: {
      status?: string;
      project_id?: string;
      priority?: number;
    }
  ): Promise<TaskWithEnergyMatch[]> {
    let query = `
      SELECT 
        t.*,
        CASE
          WHEN t.energy_requirement = $2 THEN true
          ELSE false
        END as energy_match,
        CASE
          WHEN t.energy_requirement = $2 THEN 1.0
          WHEN ABS(t.energy_requirement - $2) = 1 THEN 0.5
          ELSE 0.0
        END as energy_match_score,
        CASE 
          WHEN p.id IS NOT NULL THEN json_build_object(
            'id', p.id,
            'name', p.name,
            'color', p.color
          )
          ELSE NULL
        END as project
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = $1 AND t.status = 'pending'
    `;

    const params: any[] = [userId, currentEnergyLevel];
    let paramCount = 3;

    if (filters?.project_id) {
      query += ` AND t.project_id = $${paramCount}`;
      params.push(filters.project_id);
      paramCount++;
    }

    if (filters?.priority) {
      query += ` AND t.priority = $${paramCount}`;
      params.push(filters.priority);
      paramCount++;
    }

    query += ` ORDER BY energy_match_score DESC, t.priority DESC, t.due_date ASC NULLS LAST`;

    const tasks = await db.any(query, params);

    // Calculate bonus points
    return tasks.map(task => ({
      ...task,
      bonus_points: task.energy_match ? Math.round(task.points * 0.25) : 0
    }));
  }

  // Get task by ID
  static async findById(id: string, userId: string): Promise<Task | null> {
    try {
      return await db.one(
        'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
    } catch (error) {
      return null;
    }
  }

  // Get all user tasks
  static async getUserTasks(
    userId: string,
    filters?: {
      status?: string;
      project_id?: string;
      priority?: number;
    },
    limit = 100,
    offset = 0
  ): Promise<Task[]> {
    let query = `
      SELECT 
        t.*,
        CASE 
          WHEN p.id IS NOT NULL THEN json_build_object(
            'id', p.id,
            'name', p.name,
            'color', p.color
          )
          ELSE NULL
        END as project
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = $1
    `;
    const params: any[] = [userId];
    let paramCount = 2;

    if (filters?.status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.project_id) {
      query += ` AND t.project_id = $${paramCount}`;
      params.push(filters.project_id);
      paramCount++;
    }

    if (filters?.priority) {
      query += ` AND t.priority = $${paramCount}`;
      params.push(filters.priority);
      paramCount++;
    }

    query += ` ORDER BY t.priority DESC, t.due_date ASC NULLS LAST LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    return await db.any(query, params);
  }

  // Update task
  static async update(id: string, userId: string, data: Partial<CreateTaskData>): Promise<Task> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${paramCount}`);
      values.push(data.title);
      paramCount++;
    }

    if (data.description !== undefined) {
      fields.push(`description = $${paramCount}`);
      values.push(data.description);
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
      
      // Recalculate points if priority changed
      const energyReq = data.energy_requirement || 3;
      const newPoints = this.calculateBasePoints(data.priority, energyReq);
      fields.push(`points = $${paramCount}`);
      values.push(newPoints);
      paramCount++;
    }

    if (data.due_date !== undefined) {
      fields.push(`due_date = $${paramCount}`);
      values.push(data.due_date);
      paramCount++;
    }

    if (data.estimated_duration !== undefined) {
      fields.push(`estimated_duration = $${paramCount}`);
      values.push(data.estimated_duration);
      paramCount++;
    }

    if (data.project_id !== undefined) {
      fields.push(`project_id = $${paramCount}`);
      values.push(data.project_id);
      paramCount++;
    }

    if (data.tags !== undefined) {
      fields.push(`tags = $${paramCount}`);
      values.push(JSON.stringify(data.tags));
      paramCount++;
    }

    values.push(id, userId);

    const query = `
      UPDATE tasks
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING *
    `;

    return await db.one(query, values);
  }

  // Complete task
  static async complete(
    id: string,
    userId: string,
    actualDuration?: number,
    currentEnergyLevel?: number
  ): Promise<{ task: Task; points_earned: number; bonus_points: number }> {
    const task = await this.findById(id, userId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    // Calculate bonus points for energy match
    let bonusPoints = 0;
    if (currentEnergyLevel && task.energy_requirement === currentEnergyLevel) {
      bonusPoints = Math.round(task.points * 0.25); // 25% bonus for perfect energy match
    }

    const totalPoints = task.points + bonusPoints;

    const query = `
      UPDATE tasks
      SET status = 'completed',
          completed_at = NOW(),
          actual_duration = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;

    const completedTask = await db.one(query, [actualDuration || null, id, userId]);

    return {
      task: completedTask,
      points_earned: totalPoints,
      bonus_points: bonusPoints
    };
  }

  // Delete task
  static async delete(id: string, userId: string): Promise<boolean> {
    const result = await db.result(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rowCount > 0;
  }

  // Get task statistics
  static async getTaskStats(userId: string): Promise<any> {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '7 days') as completed_this_week,
        SUM(points) FILTER (WHERE status = 'completed') as total_points,
        AVG(actual_duration) FILTER (WHERE status = 'completed' AND actual_duration IS NOT NULL) as avg_duration
      FROM tasks
      WHERE user_id = $1
    `;

    return await db.one(query, [userId]);
  }
}
