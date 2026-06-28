import { describe, it, expect } from "vitest";
import { parseAndValidateCv } from "../lib/cv-parser";

describe("parseAndValidateCv (mock mode)", () => {
  it("rejects text shorter than 20 characters", async () => {
    const result = await parseAndValidateCv("Too short");
    expect(result.candidate).toBeNull();
    expect(result.needsReview).toBe(true);
    expect(result.reason).toContain("too short");
  });

  it("parses a well-formed French CV", async () => {
    const cvText = `Marie Dupont
+33612345678
Hôtesse d'accueil
5 ans d'expérience
Paris
Français, Anglais
150€/jour
Accueil VIP et événements corporate.`;

    const result = await parseAndValidateCv(cvText);
    expect(result.candidate).not.toBeNull();
    expect(result.candidate!.name).toBe("Marie Dupont");
    expect(result.candidate!.phone).toBe("+33612345678");
    expect(result.candidate!.role_type).toBe("hostess");
    expect(result.candidate!.years_experience).toBe(5);
    expect(result.candidate!.city).toBe("Paris");
    expect(result.candidate!.languages).toContain("Français");
    expect(result.candidate!.languages).toContain("Anglais");
  });

  it("parses a security-role CV", async () => {
    const cvText = `Karim Haddad
+33698765432
Agent de sécurité événementielle
8 ans d'expérience
Lyon
Français, Anglais
Carte pro CNAPS à jour, SSIAP 1`;

    const result = await parseAndValidateCv(cvText);
    expect(result.candidate).not.toBeNull();
    expect(result.candidate!.role_type).toBe("security");
    expect(result.candidate!.city).toBe("Lyon");
  });

  it("parses an event_staff CV", async () => {
    const cvText = `Julie Fontaine
+33612000099
Staff événementiel
3 ans d'expérience
Marseille
Français
Logistique événementielle, montage stands.`;

    const result = await parseAndValidateCv(cvText);
    expect(result.candidate).not.toBeNull();
    expect(result.candidate!.role_type).toBe("event_staff");
    expect(result.candidate!.city).toBe("Marseille");
  });

  it("flags review when no phone is found", async () => {
    const cvText = `Jean Martin
Développeur web
Paris
Français, Anglais
5 ans d'expérience en développement informatique.`;

    const result = await parseAndValidateCv(cvText);
    expect(result.candidate).toBeNull();
    expect(result.needsReview).toBe(true);
    expect(result.reason).toContain("phone");
  });

  it("extracts day rate from CV text", async () => {
    const cvText = `Sophie Lenoir
+33612345678
Hôtesse d'accueil
2 ans d'expérience
Paris
Français
Tarif: 140€/jour
Accueil salon et événementiel.`;

    const result = await parseAndValidateCv(cvText);
    expect(result.candidate).not.toBeNull();
    expect(result.candidate!.day_rate).toBe(140);
  });

  it("assigns a default rate when none found in CV", async () => {
    const cvText = `Pierre Moreau
+33612345678
Agent de sécurité
3 ans d'expérience
Paris
Français
Surveillance événementielle générale.`;

    const result = await parseAndValidateCv(cvText);
    expect(result.candidate).not.toBeNull();
    // baseRateForRole("security") is 160
    expect(result.candidate!.day_rate).toBe(160);
  });

  it("detects multiple languages", async () => {
    const cvText = `Ana Garcia
+33698765432
Hôtesse d'accueil
4 ans d'expérience
Nice
Français, Anglais, Espagnol, Allemand, Italien
Accueil multilingue.`;

    const result = await parseAndValidateCv(cvText);
    expect(result.candidate).not.toBeNull();
    expect(result.candidate!.languages).toContain("Français");
    expect(result.candidate!.languages).toContain("Anglais");
    expect(result.candidate!.languages).toContain("Espagnol");
    expect(result.candidate!.languages).toContain("Allemand");
    expect(result.candidate!.languages).toContain("Italien");
  });

  it("returns fromCache=false for fresh parses", async () => {
    const cvText = `Unique Candidate ${Date.now()}
+33612345678
hostess
1 an d'expérience
Paris
Français
Notes uniques ${Math.random()}.`;

    const result = await parseAndValidateCv(cvText);
    expect(result.fromCache).toBe(false);
  });
});
