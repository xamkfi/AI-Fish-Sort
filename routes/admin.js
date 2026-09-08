"use strict";

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const csrf = require("csurf");
const { Admin, SortingUnit, Species } = require("../models");
const importController = require("../controllers/importController");

const csrfProtection = csrf({ cookie: false });

router.get("/", (req, res) => {
  res.render("admin/dashboard", {
    title: "Fish AI Admin",
    adminLayout: true,
    activeTab: "dashboard",
  });
});

router.get("/places", (req, res) => {
  res.redirect(302, "/admin/sorting-units");
});

router.get("/sorting-units", (req, res) => {
  res.render("admin/places", {
    title: "Fish AI - Lajitteluyksiköt",
    adminLayout: true,
    activeTab: "places",
    script: "/js/admin/places.js",
  });
});

router.get("/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

router.get("/sorting-units/all", async (req, res) => {
  try {
    const sortingUnits = await SortingUnit.findAll({
      order: [["name", "ASC"]],
    });

    res.json({
      data: sortingUnits,
    });
  } catch (error) {
    console.error("Virhe lajitteluyksiköiden haussa:", error);
    res.status(500).json({ error: "Lajitteluyksiköiden haku epäonnistui." });
  }
});

router.post("/sorting-units", csrfProtection, async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const municipality =
      typeof req.body.municipality === "string"
        ? req.body.municipality.trim()
        : null;
    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : null;

    if (!name) {
      return res
        .status(400)
        .json({ error: "Lajitteluyksikön nimi on pakollinen." });
    }

    const sortingUnit = await SortingUnit.create({
      name,
      municipality: municipality || null,
      description: description || null,
    });

    res.status(201).json({
      message: "Lajitteluyksikkö lisätty onnistuneesti.",
      data: sortingUnit,
    });
  } catch (error) {
    console.error("Virhe lajitteluyksikön tallennuksessa:", error);
    res.status(500).json({ error: "Lajitteluyksikön tallennus epäonnistui." });
  }
});

router.put("/sorting-units/:id", csrfProtection, async (req, res) => {
  try {
    const sortingUnit = await SortingUnit.findByPk(req.params.id);
    if (!sortingUnit) {
      return res.status(404).json({ error: "Lajitteluyksikköä ei löytynyt." });
    }

    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const municipality =
      typeof req.body.municipality === "string"
        ? req.body.municipality.trim()
        : null;
    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : null;

    if (!name) {
      return res
        .status(400)
        .json({ error: "Lajitteluyksikön nimi on pakollinen." });
    }

    await sortingUnit.update({
      name,
      municipality: municipality || null,
      description: description || null,
    });

    res.json({
      message: "Lajitteluyksikkö päivitetty onnistuneesti.",
      data: sortingUnit,
    });
  } catch (error) {
    console.error("Virhe lajitteluyksikön päivityksessä:", error);
    res.status(500).json({ error: "Lajitteluyksikön päivitys epäonnistui." });
  }
});

router.delete("/sorting-units/:id", csrfProtection, async (req, res) => {
  try {
    const sortingUnit = await SortingUnit.findByPk(req.params.id);
    if (!sortingUnit) {
      return res.status(404).json({ error: "Lajitteluyksikköä ei löytynyt." });
    }

    await sortingUnit.destroy();

    res.json({
      message: "Lajitteluyksikkö poistettu onnistuneesti.",
    });
  } catch (error) {
    console.error("Virhe lajitteluyksikön poistossa:", error);
    res.status(500).json({ error: "Lajitteluyksikön poisto epäonnistui." });
  }
});

router.get("/fish", (req, res) => {
  res.render("admin/fish", {
    title: "Fish AI - Kalat",
    adminLayout: true,
    activeTab: "fish",
    script: "/js/admin/fish.js",
  });
});

router.get("/fish/all", async (req, res) => {
  try {
    const species = await Species.findAll({
      order: [["finnishName", "ASC"]],
    });

    res.json({
      data: species,
    });
  } catch (error) {
    console.error("Virhe kalojen haussa:", error);
    res.status(500).json({ error: "Kalojen haku epaonnistui." });
  }
});

router.post("/fish", csrfProtection, async (req, res) => {
  try {
    const finnishName =
      typeof req.body.finnishName === "string"
        ? req.body.finnishName.trim()
        : "";
    const scientificName =
      typeof req.body.scientificName === "string"
        ? req.body.scientificName.trim()
        : null;

    if (!finnishName) {
      return res.status(400).json({ error: "Kalan nimi on pakollinen." });
    }

    const species = await Species.create({
      finnishName,
      scientificName: scientificName || null,
    });

    res.status(201).json({
      message: "Kala lisatty onnistuneesti.",
      data: species,
    });
  } catch (error) {
    console.error("Virhe kalan tallennuksessa:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({ error: "Talla nimella oleva kala on jo olemassa." });
    }

    res.status(500).json({ error: "Kalan tallennus epaonnistui." });
  }
});

router.put("/fish/:id", csrfProtection, async (req, res) => {
  try {
    const species = await Species.findByPk(req.params.id);
    if (!species) {
      return res.status(404).json({ error: "Kalaa ei loytynyt." });
    }

    const finnishName =
      typeof req.body.finnishName === "string"
        ? req.body.finnishName.trim()
        : "";
    const scientificName =
      typeof req.body.scientificName === "string"
        ? req.body.scientificName.trim()
        : null;

    if (!finnishName) {
      return res.status(400).json({ error: "Kalan nimi on pakollinen." });
    }

    await species.update({
      finnishName,
      scientificName: scientificName || null,
    });

    res.json({
      message: "Kala paivitetty onnistuneesti.",
      data: species,
    });
  } catch (error) {
    console.error("Virhe kalan paivityksessa:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({ error: "Talla nimella oleva kala on jo olemassa." });
    }

    res.status(500).json({ error: "Kalan paivitys epaonnistui." });
  }
});

router.delete("/fish/:id", csrfProtection, async (req, res) => {
  try {
    const species = await Species.findByPk(req.params.id);
    if (!species) {
      return res.status(404).json({ error: "Kalaa ei loytynyt." });
    }

    await species.destroy();

    res.json({
      message: "Kala poistettu onnistuneesti.",
    });
  } catch (error) {
    console.error("Virhe kalan poistossa:", error);

    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({
        error:
          "Kalaa ei voi poistaa, koska siihen viittaa olemassa olevia havaintoja.",
      });
    }

    res.status(500).json({ error: "Kalan poisto epaonnistui." });
  }
});

router.get("/guides", (req, res) => {
  res.render("admin/guides", {
    title: "Fish AI - Ohjeet",
    adminLayout: true,
    activeTab: "guides",
  });
});

router.get("/import", (req, res) => {
  res.render("admin/import", {
    title: "Fish AI - Tuo dataa",
    adminLayout: true,
    activeTab: "import",
    script: "/js/admin/import.js",
  });
});

router.get("/import/options", importController.showOptions);
router.post("/import/observations", csrfProtection, importController.importObservations);

router.get("/change-password", csrfProtection, (req, res) => {
  res.render("admin/changePassword", {
    title: "Fish AI - Vaihda salasana",
    adminLayout: true,
    activeTab: "change-password",
    csrfToken: req.csrfToken(),
    success: null,
    error: null,
  });
});

router.post("/change-password", csrfProtection, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const renderPage = (values) =>
    res.render("admin/changePassword", {
      title: "Fish AI - Vaihda salasana",
      adminLayout: true,
      activeTab: "change-password",
      csrfToken: req.csrfToken(),
      success: values.success || null,
      error: values.error || null,
    });

  if (!currentPassword || !newPassword || !confirmPassword) {
    return renderPage({ error: "Kaikki kentat ovat pakollisia" });
  }

  if (newPassword.length < 8) {
    return renderPage({
      error: "Uuden salasanan on oltava vahintaan 8 merkkia",
    });
  }

  if (newPassword !== confirmPassword) {
    return renderPage({ error: "Uudet salasanat eivat tasmaa" });
  }

  const admin = await Admin.findByPk(req.session.adminId);
  if (!admin) {
    return renderPage({ error: "Admin-kayttajaa ei loytynyt" });
  }

  const validCurrent = await bcrypt.compare(
    currentPassword,
    admin.passwordHash,
  );
  if (!validCurrent) {
    return renderPage({ error: "Nykyinen salasana on vaara" });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await admin.update({ passwordHash: newHash });

  res.render("admin/changePassword", {
    title: "Fish AI - Vaihda salasana",
    adminLayout: true,
    activeTab: "change-password",
    csrfToken: req.csrfToken(),
    success: "Salasana vaihdettu onnistuneesti!",
    error: null,
  });
});

module.exports = router;
