import db from '../utils/database';

export interface EnergyLog {
  id: string;
  user_id: string;
  energy_level: number; // 1=LOW, 2=MEDIUM-LOW, 3=MEDIUM, 4=HIGH, 5=PEAK
  mood_tags?: string[];
  notes?: string;
  logged_at: Date;
  predicted_at?: Date;
}

export interface CreateEnergyLog {
  user_id: string;
  energy_level: number;
  mood_tags?: string[];
  notes?: string;
}

export interface EnergyPattern {
  user_id: string;
  average_energy: number;
  peak_hours: number[];
  low_hours: number[];
  patterns: any;
}

export class EnergyModel {
  // Log energy
  static async logEnergy(data: CreateEnergyLog): Promise<EnergyLog> {
    const query = `
      INSERT INTO energy_logs (user_id, energy_level, mood_tags, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    return await db.one(query, [
      data.user_id,
      data.energy_level,
      data.mood_tags || null,
      data.notes || null
    ]);
  }

  // Get user's energy logs
  static async getUserEnergyLogs(
    userId: string,
    limit = 100,
    offset = 0
  ): Promise<EnergyLog[]> {
    const query = `
      SELECT * FROM energy_logs
      WHERE user_id = $1
      ORDER BY logged_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    return await db.any(query, [userId, limit, offset]);
  }

  // Get latest energy log
  static async getLatestEnergy(userId: string): Promise<EnergyLog | null> {
    try {
      return await db.one(
        'SELECT * FROM energy_logs WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 1',
        [userId]
      );
    } catch (error) {
      return null;
    }
  }

  // Get energy logs for date range
  static async getEnergyByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EnergyLog[]> {
    const query = `
      SELECT * FROM energy_logs
      WHERE user_id = $1
        AND logged_at >= $2
        AND logged_at <= $3
      ORDER BY logged_at ASC
    `;
    
    return await db.any(query, [userId, startDate, endDate]);
  }

  // Calculate energy pattern
  static async calculateEnergyPattern(userId: string): Promise<EnergyPattern> {
    const query = `
      SELECT 
        user_id,
        AVG(energy_level) as average_energy,
        ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM logged_at)) as hours,
        COUNT(*) as total_logs
      FROM energy_logs
      WHERE user_id = $1
        AND logged_at > NOW() - INTERVAL '30 days'
      GROUP BY user_id
    `;
    
    const result = await db.oneOrNone(query, [userId]);
    
    if (!result) {
      return {
        user_id: userId,
        average_energy: 3,
        peak_hours: [],
        low_hours: [],
        patterns: {}
      };
    }

    // Analyze peak and low hours
    const hourlyEnergy = await db.any(`
      SELECT 
        EXTRACT(HOUR FROM logged_at) as hour,
        AVG(energy_level) as avg_energy,
        COUNT(*) as count
      FROM energy_logs
      WHERE user_id = $1
        AND logged_at > NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM logged_at)
      ORDER BY avg_energy DESC
    `, [userId]);

    const peakHours = hourlyEnergy
      .filter(h => h.avg_energy >= 4)
      .map(h => parseInt(h.hour))
      .slice(0, 3);

    const lowHours = hourlyEnergy
      .filter(h => h.avg_energy <= 2)
      .map(h => parseInt(h.hour))
      .slice(-3);

    return {
      user_id: userId,
      average_energy: parseFloat(result.average_energy),
      peak_hours: peakHours,
      low_hours: lowHours,
      patterns: {
        total_logs: result.total_logs,
        hourly_data: hourlyEnergy
      }
    };
  }

  // Get energy insights
  static async getEnergyInsights(userId: string): Promise<any> {
    const pattern = await this.calculateEnergyPattern(userId);
    const latest = await this.getLatestEnergy(userId);
    
    const insights = [];
    
    // Peak hours insight
    if (pattern.peak_hours.length > 0) {
      insights.push({
        type: 'peak_hours',
        message: `Your peak energy hours are: ${pattern.peak_hours.join(', ')}:00`,
        confidence: 0.85
      });
    }

    // Current energy insight
    if (latest) {
      const currentHour = new Date().getHours();
      const isPeakTime = pattern.peak_hours.includes(currentHour);
      
      if (isPeakTime && latest.energy_level < 4) {
        insights.push({
          type: 'energy_mismatch',
          message: 'This is usually your peak time, but your energy is lower than expected',
          confidence: 0.75
        });
      }
    }

    // Average energy insight
    if (pattern.average_energy < 3) {
      insights.push({
        type: 'low_average',
        message: 'Your average energy has been low recently. Consider adjusting your schedule or taking breaks.',
        confidence: 0.8
      });
    }

    return {
      pattern,
      latest,
      insights
    };
  }

  // Delete old energy logs (cleanup)
  static async cleanupOldLogs(daysToKeep = 90): Promise<number> {
    const result = await db.result(
      'DELETE FROM energy_logs WHERE logged_at < NOW() - INTERVAL \'$1 days\'',
      [daysToKeep]
    );
    return result.rowCount;
  }
}
