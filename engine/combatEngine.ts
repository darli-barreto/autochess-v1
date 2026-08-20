import {
  BoardUnit,
  AxialCoord,
  DamageType,
  DamageNumberEvent,
  ProjectileEvent,
  VisualEffectEvent,
  TraitId,
} from '@/types/game';
import { CHAMPIONS_DATA } from '@/data/champions';
import { ALL_ITEMS } from '@/data/items';
import { TRAITS_DATA } from '@/data/traits';
import { hexDistance, findHexPath, axialToRowCol, rowColToAxial, axialToWorld3D } from './hexMath';

export interface CombatTickResult {
  allies: BoardUnit[];
  enemies: BoardUnit[];
  damageEvents: DamageNumberEvent[];
  projectileEvents: ProjectileEvent[];
  vfxEvents: VisualEffectEvent[];
  isCombatOver: boolean;
  winningTeam: 'ally' | 'enemy' | 'draw' | null;
}

export class CombatEngine {
  public allies: BoardUnit[] = [];
  public enemies: BoardUnit[] = [];
  public damageEvents: DamageNumberEvent[] = [];
  public projectileEvents: ProjectileEvent[] = [];
  public vfxEvents: VisualEffectEvent[] = [];
  public combatTime: number = 0; // seconds
  public maxCombatDuration: number = 40; // 40 seconds max per GDD
  public isOver: boolean = false;
  public winner: 'ally' | 'enemy' | 'draw' | null = null;

  // Active trait bonuses
  private allyTraits: Record<TraitId, number> = {} as any;
  private enemyTraits: Record<TraitId, number> = {} as any;

  constructor(
    initialAllies: BoardUnit[],
    initialEnemies: BoardUnit[],
    allyTraits: Record<TraitId, number> = {} as any,
    enemyTraits: Record<TraitId, number> = {} as any
  ) {
    this.allyTraits = allyTraits;
    this.enemyTraits = enemyTraits;

    // Deep clone units and initialize combat stats
    this.allies = initialAllies.map((u) => this.initCombatUnit(u, 'ally', allyTraits));
    this.enemies = initialEnemies.map((u) => this.initCombatUnit(u, 'enemy', enemyTraits));

    // Handle Assassins jumping to backline at round start
    this.performAssassinJumps();
  }

  private initCombatUnit(unit: BoardUnit, team: 'ally' | 'enemy', activeTraits: Record<TraitId, number>): BoardUnit {
    const base = CHAMPIONS_DATA[unit.championId];
    const starIdx = (unit.starLevel - 1) as 0 | 1 | 2;
    let maxHp = base ? base.stats.health[starIdx] : 600;
    const baseAd = base ? base.stats.attackDamage[starIdx] : 50;

    // Calculate item stats
    let bonusHp = 0;
    let bonusShield = 0;

    for (const itemId of unit.items) {
      const item = ALL_ITEMS[itemId];
      if (item && item.stats.health) {
        bonusHp += item.stats.health;
      }
    }

    // Trait bonuses
    if (activeTraits.brawler && activeTraits.brawler >= 2) {
      bonusHp += activeTraits.brawler >= 4 ? 700 : 300;
    }
    if (activeTraits.elementalist && activeTraits.elementalist >= 2) {
      bonusShield += activeTraits.elementalist >= 3 ? 550 : 250;
    }
    if (activeTraits.cybernetic && unit.items.length > 0 && activeTraits.cybernetic >= 3) {
      bonusHp += activeTraits.cybernetic >= 6 ? 800 : 350;
    }

    maxHp += bonusHp;

    return {
      ...unit,
      team,
      maxHealth: maxHp,
      currentHealth: maxHp,
      shield: bonusShield,
      currentMana: base ? base.stats.startingMana : 0,
      maxMana: base ? base.stats.maxMana : 100,
      state: 'IDLE',
      targetInstanceId: null,
      currentPath: [],
      attackCooldown: 0,
      castingTimer: 0,
      stunTimer: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalHealing: 0,
      kills: 0,
    };
  }

  private performAssassinJumps() {
    const allUnits = [...this.allies, ...this.enemies];
    for (const unit of allUnits) {
      const base = CHAMPIONS_DATA[unit.championId];
      if (!base || !unit.gridPosition) continue;

      const isAssassin = base.traits.includes('assassin');
      if (isAssassin) {
        // Jump to opposite backline row (row 0 for ally, row 7 for enemy)
        const targetRow = unit.team === 'ally' ? 0 : 7;
        const currentCoord = unit.gridPosition;
        const { col } = axialToRowCol(currentCoord);
        const targetCoord = rowColToAxial(targetRow, col);

        // Check if tile is free
        const isOccupied = allUnits.some(
          (u) => u.gridPosition && u.gridPosition.q === targetCoord.q && u.gridPosition.r === targetCoord.r
        );

        if (!isOccupied) {
          unit.gridPosition = targetCoord;
          // Spawn puff VFX
          const pos = axialToWorld3D(targetCoord);
          this.vfxEvents.push({
            id: `jump_${unit.instanceId}_${Date.now()}`,
            type: 'spell_cast',
            x: pos.x,
            y: 0.5,
            z: pos.z,
            color: '#a855f7',
            radius: 1.2,
            duration: 0.5,
            age: 0,
          });
        }
      }
    }
  }

  /**
   * Main Simulation Step (Run every dt = 0.033s / 30Hz)
   */
  public step(dt: number): CombatTickResult {
    if (this.isOver) {
      return this.getResult();
    }

    this.combatTime += dt;
    this.damageEvents = [];
    this.projectileEvents = [];
    this.vfxEvents = [];

    // Filter alive units
    const aliveAllies = this.allies.filter((u) => u.state !== 'DEAD' && u.currentHealth > 0);
    const aliveEnemies = this.enemies.filter((u) => u.state !== 'DEAD' && u.currentHealth > 0);

    // Check Win/Loss conditions
    if (aliveAllies.length === 0 && aliveEnemies.length === 0) {
      this.isOver = true;
      this.winner = 'draw';
      return this.getResult();
    } else if (aliveAllies.length === 0) {
      this.isOver = true;
      this.winner = 'enemy';
      return this.getResult();
    } else if (aliveEnemies.length === 0) {
      this.isOver = true;
      this.winner = 'ally';
      return this.getResult();
    }

    // Time limit reached
    if (this.combatTime >= this.maxCombatDuration) {
      this.isOver = true;
      this.winner = aliveAllies.length >= aliveEnemies.length ? 'ally' : 'enemy';
      return this.getResult();
    }

    const allAlive = [...aliveAllies, ...aliveEnemies];
    const occupiedCoords = new Set<string>();
    allAlive.forEach((u) => {
      if (u.gridPosition) {
        occupiedCoords.add(`${u.gridPosition.q},${u.gridPosition.r}`);
      }
    });

    // Simulate each unit
    for (const unit of allAlive) {
      this.updateUnit(unit, allAlive, occupiedCoords, dt);
    }

    return this.getResult();
  }

  private updateUnit(
    unit: BoardUnit,
    allUnits: BoardUnit[],
    occupiedCoords: Set<string>,
    dt: number
  ) {
    if (unit.state === 'DEAD' || unit.currentHealth <= 0) {
      unit.state = 'DEAD';
      return;
    }

    // Decrement stun
    if (unit.stunTimer > 0) {
      unit.stunTimer -= dt;
      if (unit.stunTimer <= 0) {
        unit.state = 'IDLE';
      } else {
        unit.state = 'STUNNED';
        return;
      }
    }

    const base = CHAMPIONS_DATA[unit.championId];
    if (!base || !unit.gridPosition) return;

    const starIdx = (unit.starLevel - 1) as 0 | 1 | 2;
    const teamTargets = allUnits.filter((u) => u.team !== unit.team && u.state !== 'DEAD' && u.currentHealth > 0);

    if (teamTargets.length === 0) {
      unit.state = 'IDLE';
      unit.targetInstanceId = null;
      return;
    }

    // --- STATE MACHINE ---
    if (unit.state === 'CASTING') {
      unit.castingTimer -= dt;
      if (unit.castingTimer <= 0) {
        this.executeSpell(unit, allUnits);
        unit.currentMana = 0;
        unit.state = 'IDLE';
      }
      return;
    }

    // Check if ready to cast spell!
    if (unit.currentMana >= unit.maxMana && unit.maxMana > 0) {
      unit.state = 'CASTING';
      unit.castingTimer = (base.ability.castTimeMs || 400) / 1000;
      return;
    }

    // Validate Target
    let currentTarget: BoardUnit | null | undefined = teamTargets.find((t) => t.instanceId === unit.targetInstanceId);
    if (!currentTarget || currentTarget.state === 'DEAD' || currentTarget.currentHealth <= 0 || !currentTarget.gridPosition) {
      // Find new closest target
      let closestTarget: BoardUnit | null = null;
      let minDistance = Infinity;

      for (const target of teamTargets) {
        if (!target.gridPosition) continue;
        const dist = hexDistance(unit.gridPosition, target.gridPosition);
        if (dist < minDistance) {
          minDistance = dist;
          closestTarget = target;
        }
      }

      currentTarget = closestTarget;
      unit.targetInstanceId = currentTarget ? currentTarget.instanceId : null;
      unit.currentPath = [];
    }

    if (!currentTarget || !currentTarget.gridPosition) {
      unit.state = 'IDLE';
      return;
    }

    const distToTarget = hexDistance(unit.gridPosition, currentTarget.gridPosition);
    const attackRange = base.stats.attackRange || 1;

    // In Attack Range?
    if (distToTarget <= attackRange) {
      unit.state = 'ATTACKING';
      unit.attackCooldown -= dt;

      if (unit.attackCooldown <= 0) {
        this.executeAutoAttack(unit, currentTarget);
        const attacksPerSec = base.stats.attackSpeed || 0.65;
        unit.attackCooldown = 1 / Math.max(0.2, attacksPerSec);
      }
    } else {
      // Need to move closer using A* Pathfinding
      unit.state = 'MOVING';

      if (unit.currentPath.length === 0) {
        unit.currentPath = findHexPath(unit.gridPosition, currentTarget.gridPosition, occupiedCoords, attackRange);
      }

      if (unit.currentPath.length > 0) {
        unit.attackCooldown -= dt;
        // Move every 0.35 seconds per tile
        if (unit.attackCooldown <= 0) {
          const nextStep = unit.currentPath.shift();
          if (nextStep) {
            const nextKey = `${nextStep.q},${nextStep.r}`;
            if (!occupiedCoords.has(nextKey)) {
              occupiedCoords.delete(`${unit.gridPosition.q},${unit.gridPosition.r}`);
              unit.gridPosition = nextStep;
              occupiedCoords.add(nextKey);
            }
          }
          unit.attackCooldown = 0.35;
        }
      }
    }
  }

  private executeAutoAttack(attacker: BoardUnit, target: BoardUnit) {
    const base = CHAMPIONS_DATA[attacker.championId];
    if (!base || !attacker.gridPosition || !target.gridPosition) return;

    const starIdx = (attacker.starLevel - 1) as 0 | 1 | 2;
    let rawAd = base.stats.attackDamage[starIdx] || 50;

    // Apply item stats
    let bonusAd = 0;
    let bonusCrit = base.stats.critChance || 0.25;
    let critMult = base.stats.critMultiplier || 1.5;

    for (const itemId of attacker.items) {
      const item = ALL_ITEMS[itemId];
      if (item) {
        if (item.stats.ad) bonusAd += item.stats.ad;
        if (item.stats.critChance) bonusCrit += item.stats.critChance;
      }
    }

    rawAd += bonusAd;

    // Trait bonuses
    const activeTraits = attacker.team === 'ally' ? this.allyTraits : this.enemyTraits;
    if (activeTraits.assassin && activeTraits.assassin >= 2) {
      bonusCrit += activeTraits.assassin >= 4 ? 0.5 : 0.25;
      critMult += activeTraits.assassin >= 4 ? 0.75 : 0.3;
    }
    if (activeTraits.cybernetic && attacker.items.length > 0 && activeTraits.cybernetic >= 3) {
      rawAd += activeTraits.cybernetic >= 6 ? 80 : 35;
    }

    // Crit calculation
    const isCrit = Math.random() < bonusCrit;
    if (isCrit) {
      rawAd *= critMult;
    }

    // Damage mitigation
    const targetArmor = this.getUnitArmor(target);
    const damageReduction = 100 / (100 + Math.max(0, targetArmor));
    let finalDamage = Math.round(rawAd * damageReduction);

    // Void true damage
    if (activeTraits.void && activeTraits.void >= 2) {
      const voidRatio = activeTraits.void >= 4 ? 1.0 : 0.35;
      finalDamage = Math.round(rawAd * (1 - voidRatio) * damageReduction + rawAd * voidRatio);
    }

    // Apply damage to target
    this.applyDamage(target, attacker, finalDamage, 'physical', isCrit);

    // Mana gain on attack (+10 default, +Mage traits, +Shojin item)
    let manaGain = 10;
    if (activeTraits.mage && activeTraits.mage >= 2) {
      manaGain += activeTraits.mage >= 6 ? 20 : activeTraits.mage >= 4 ? 12 : 5;
    }
    attacker.currentMana = Math.min(attacker.maxMana, attacker.currentMana + manaGain);

    // Spawn Projectile if ranged
    const srcWorld = axialToWorld3D(attacker.gridPosition, 0.5);
    const targetWorld = axialToWorld3D(target.gridPosition, 0.5);

    if (base.stats.attackRange > 1) {
      this.projectileEvents.push({
        id: `proj_${Date.now()}_${Math.random()}`,
        sourceX: srcWorld.x,
        sourceY: srcWorld.y,
        sourceZ: srcWorld.z,
        targetX: targetWorld.x,
        targetY: targetWorld.y,
        targetZ: targetWorld.z,
        color: base.color || '#fbbf24',
        speed: 12,
        progress: 0,
        vfx: 'basic_arrow',
      });
    }
  }

  private executeSpell(caster: BoardUnit, allUnits: BoardUnit[]) {
    const base = CHAMPIONS_DATA[caster.championId];
    if (!base || !caster.gridPosition) return;

    const starIdx = (caster.starLevel - 1) as 0 | 1 | 2;
    const ability = base.ability;
    let spellPowerMult = 1.0;

    // Calculate AP from items & traits
    let totalAp = 0;
    for (const itemId of caster.items) {
      const item = ALL_ITEMS[itemId];
      if (item && item.stats.ap) totalAp += item.stats.ap;
    }

    const activeTraits = caster.team === 'ally' ? this.allyTraits : this.enemyTraits;
    if (activeTraits.mage && activeTraits.mage >= 2) {
      totalAp += activeTraits.mage >= 6 ? 150 : activeTraits.mage >= 4 ? 80 : 30;
    }

    spellPowerMult += totalAp / 100;

    const enemies = allUnits.filter((u) => u.team !== caster.team && u.state !== 'DEAD' && u.currentHealth > 0);
    const allies = allUnits.filter((u) => u.team === caster.team && u.state !== 'DEAD' && u.currentHealth > 0);

    const casterWorld = axialToWorld3D(caster.gridPosition, 0.5);

    // VFX trigger
    this.vfxEvents.push({
      id: `spell_vfx_${caster.instanceId}_${Date.now()}`,
      type: 'spell_cast',
      x: casterWorld.x,
      y: casterWorld.y,
      z: casterWorld.z,
      color: base.accentColor || '#38bdf8',
      radius: (ability.values.aoeRadius || 1) * 1.5,
      duration: 0.8,
      age: 0,
    });

    const baseDamage = (ability.values.damage ? ability.values.damage[starIdx] : 0) * spellPowerMult;
    const baseHeal = (ability.values.heal ? ability.values.heal[starIdx] : 0) * spellPowerMult;
    const baseShield = (ability.values.shield ? ability.values.shield[starIdx] : 0) * spellPowerMult;

    // Heal / Shield targets
    if (baseHeal > 0 || baseShield > 0) {
      const lowestAlly = allies.reduce((lowest, u) => (u.currentHealth < lowest.currentHealth ? u : lowest), allies[0]);
      if (lowestAlly) {
        if (baseHeal > 0) {
          lowestAlly.currentHealth = Math.min(lowestAlly.maxHealth, lowestAlly.currentHealth + Math.round(baseHeal));
          caster.totalHealing += Math.round(baseHeal);
        }
        if (baseShield > 0) {
          lowestAlly.shield += Math.round(baseShield);
        }
      }
    }

    // Damage logic based on target rule
    if (baseDamage > 0) {
      if (ability.targetRule === 'aoe_circle') {
        const radius = ability.values.aoeRadius || 2;
        for (const enemy of enemies) {
          if (!enemy.gridPosition) continue;
          if (hexDistance(caster.gridPosition, enemy.gridPosition) <= radius) {
            this.dealSpellDamage(enemy, caster, baseDamage, ability.damageType);
          }
        }
      } else if (ability.targetRule === 'lowest_hp') {
        const lowestEnemy = enemies.reduce((lowest, u) => (u.currentHealth < lowest.currentHealth ? u : lowest), enemies[0]);
        if (lowestEnemy) {
          this.dealSpellDamage(lowestEnemy, caster, baseDamage, ability.damageType);
        }
      } else {
        // Current target
        const currentTarget = enemies.find((e) => e.instanceId === caster.targetInstanceId) || enemies[0];
        if (currentTarget) {
          this.dealSpellDamage(currentTarget, caster, baseDamage, ability.damageType);
        }
      }
    }
  }

  private dealSpellDamage(target: BoardUnit, caster: BoardUnit, rawDamage: number, damageType: DamageType) {
    let finalDamage = rawDamage;

    if (damageType === 'magic') {
      const mr = this.getUnitMR(target);
      finalDamage = Math.round(rawDamage * (100 / (100 + Math.max(0, mr))));
    } else if (damageType === 'physical') {
      const armor = this.getUnitArmor(target);
      finalDamage = Math.round(rawDamage * (100 / (100 + Math.max(0, armor))));
    }

    this.applyDamage(target, caster, finalDamage, damageType, false);
  }

  private applyDamage(
    target: BoardUnit,
    attacker: BoardUnit,
    damage: number,
    damageType: DamageType,
    isCrit: boolean
  ) {
    if (target.state === 'DEAD') return;

    let remainingDamage = damage;

    // Absorb shield first
    if (target.shield > 0) {
      if (target.shield >= remainingDamage) {
        target.shield -= remainingDamage;
        remainingDamage = 0;
      } else {
        remainingDamage -= target.shield;
        target.shield = 0;
      }
    }

    target.currentHealth = Math.max(0, target.currentHealth - remainingDamage);
    attacker.totalDamageDealt += damage;
    target.totalDamageTaken += damage;

    // Gain mana on taking damage (1 mana per 1% HP lost)
    const hpPercentLost = (damage / target.maxHealth) * 100;
    target.currentMana = Math.min(target.maxMana, target.currentMana + Math.round(hpPercentLost * 0.4));

    // Emit damage number event for 3D world display
    if (target.gridPosition) {
      const pos = axialToWorld3D(target.gridPosition, 1.2);
      this.damageEvents.push({
        id: `dmg_${Date.now()}_${Math.random()}`,
        amount: damage,
        damageType,
        isCrit,
        x: pos.x + (Math.random() - 0.5) * 0.4,
        y: pos.y + Math.random() * 0.3,
        z: pos.z,
        timestamp: Date.now(),
      });
    }

    // Check death
    if (target.currentHealth <= 0) {
      target.state = 'DEAD';
      attacker.kills += 1;

      // Death burst VFX
      if (target.gridPosition) {
        const deathPos = axialToWorld3D(target.gridPosition, 0.4);
        this.vfxEvents.push({
          id: `death_${target.instanceId}_${Date.now()}`,
          type: 'death_burst',
          x: deathPos.x,
          y: deathPos.y,
          z: deathPos.z,
          color: '#ef4444',
          radius: 1.5,
          duration: 0.6,
          age: 0,
        });
      }
    }
  }

  private getUnitArmor(unit: BoardUnit): number {
    const base = CHAMPIONS_DATA[unit.championId];
    let armor = base ? base.stats.armor : 20;

    for (const itemId of unit.items) {
      const item = ALL_ITEMS[itemId];
      if (item && item.stats.armor) armor += item.stats.armor;
    }

    const traits = unit.team === 'ally' ? this.allyTraits : this.enemyTraits;
    if (traits.vanguard && traits.vanguard >= 2) {
      armor += traits.vanguard >= 4 ? 100 : 40;
    }

    return armor;
  }

  private getUnitMR(unit: BoardUnit): number {
    const base = CHAMPIONS_DATA[unit.championId];
    let mr = base ? base.stats.magicResist : 20;

    for (const itemId of unit.items) {
      const item = ALL_ITEMS[itemId];
      if (item && item.stats.mr) mr += item.stats.mr;
    }

    const traits = unit.team === 'ally' ? this.allyTraits : this.enemyTraits;
    if (traits.mystic && traits.mystic >= 2) {
      mr += traits.mystic >= 4 ? 100 : 40;
    }

    return mr;
  }

  private getResult(): CombatTickResult {
    return {
      allies: this.allies,
      enemies: this.enemies,
      damageEvents: this.damageEvents,
      projectileEvents: this.projectileEvents,
      vfxEvents: this.vfxEvents,
      isCombatOver: this.isOver,
      winningTeam: this.winner,
    };
  }
}
