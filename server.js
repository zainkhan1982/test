const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const multer = require("multer");
const Company = require("./models/Company");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/Company", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve public assets
app.use("/public", express.static(path.join(__dirname, "public")));
// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads"); // save in /uploads folder
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// GET: Company profile page
app.get("/", (req, res) => res.redirect("/company-profile"));

app.get("/company-profile", async (req, res) => {
  try {
    const user = await Company.findOne();
    res.render("company_profile", {
      user: user || {},
      profileError: null,
      profileSuccess: null,
      settingsError: null,
      settingsSuccess: null,
      passwordError: null,
      passwordSuccess: null
    });
  } catch (err) {
    res.status(500).send("Error loading profile.");
  }
});

// POST: Save profile with images + text fields
app.post(
  "/save-profile",
  upload.fields([
    { name: "gstCertificate", maxCount: 1 },
    { name: "signatory", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const payload = {
        legalName: (req.body.legalName || "").trim(),
        email: (req.body.email || "").trim(),
        phone: (req.body.phone || "").trim(),
        gstNumber: (req.body.gstNumber || "").trim(),
        address: (req.body.address || "").trim()
      };

      const { legalName, email, phone, gstNumber, address } = payload;

      // Validations
      if (!legalName || !email || !phone || !gstNumber || !address) {
        const user = await Company.findOne() || {};
        return res.render("company_profile", {
          user,
          profileError: "All fields are required.",
          profileSuccess: null,
          settingsError: null,
          settingsSuccess: null,
          passwordError: null,
          passwordSuccess: null
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\d{10}$/;
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;

      if (!emailRegex.test(email) || !phoneRegex.test(phone) || !gstRegex.test(gstNumber)) {
        const user = await Company.findOne() || {};
        return res.render("company_profile", {
          user,
          profileError: "Invalid details. Please check your input.",
          profileSuccess: null,
          settingsError: null,
          settingsSuccess: null,
          passwordError: null,
          passwordSuccess: null
        });
      }

      // Find or create company
      let company = await Company.findOne();
      if (!company) company = new Company();

      // Save text fields
      company.legalName = legalName;
      company.email = email.toLowerCase();
      company.phone = phone;
      company.gstNumber = gstNumber;
      company.address = address;

      // Save uploaded file paths
      if (req.files?.gstCertificate) {
        company.gstCertificate = `/uploads/${req.files.gstCertificate[0].filename}`;
      }
      if (req.files?.signatory) {
        company.signatory = `/uploads/${req.files.signatory[0].filename}`;
      }

      await company.save();

      res.render("company_profile", {
        user: company,
        profileError: null,
        profileSuccess: "Profile updated successfully.",
        settingsError: null,
        settingsSuccess: null,
        passwordError: null,
        passwordSuccess: null
      });
    } catch (err) {
      console.error("Error saving profile:", err);
      const user = await Company.findOne() || {};
      res.render("company_profile", {
        user,
        profileError: "Server error. Please try again later.",
        profileSuccess: null,
        settingsError: null,
        settingsSuccess: null,
        passwordError: null,
        passwordSuccess: null
      });
    }
  }
);

// POST: Save settings
app.post("/save-settings", async (req, res) => {
  try {
    const { notifyChanges, notifyProducts, notifyPromos } = req.body;
    const company = await Company.findOne();
    
    if (!company) {
      return res.render("company_profile", {
        user: {},
        profileError: null,
        profileSuccess: null,
        settingsError: "Company not found.",
        settingsSuccess: null,
        passwordError: null,
        passwordSuccess: null
      });
    }

    // Update notification settings
    company.notifyChanges = !!notifyChanges;
    company.notifyProducts = !!notifyProducts;
    company.notifyPromos = !!notifyPromos;

    await company.save();

    res.render("company_profile", {
      user: company,
      profileError: null,
      profileSuccess: null,
      settingsError: null,
      settingsSuccess: "Settings updated successfully.",
      passwordError: null,
      passwordSuccess: null
    });
  } catch (err) {
    console.error("Error saving settings:", err);
    const user = await Company.findOne() || {};
    res.render("company_profile", {
      user,
      profileError: null,
      profileSuccess: null,
      settingsError: "Server error. Please try again later.",
      settingsSuccess: null,
      passwordError: null,
      passwordSuccess: null
    });
  }
});

// POST: Change password
app.post("/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword, renewPassword } = req.body;
    const company = await Company.findOne();

    if (!company?.password) {
      return res.render("company_profile", {
        user: company || {},
        profileError: null,
        profileSuccess: null,
        settingsError: null,
        settingsSuccess: null,
        passwordError: "No password is set.",
        passwordSuccess: null
      });
    }

    if (!currentPassword || !newPassword || !renewPassword) {
      return res.render("company_profile", {
        user: company,
        profileError: null,
        profileSuccess: null,
        settingsError: null,
        settingsSuccess: null,
        passwordError: "All fields are required.",
        passwordSuccess: null
      });
    }

    if (company.password !== currentPassword) {
      return res.render("company_profile", {
        user: company,
        profileError: null,
        profileSuccess: null,
        settingsError: null,
        settingsSuccess: null,
        passwordError: "Current password is incorrect.",
        passwordSuccess: null
      });
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strongPassword.test(newPassword)) {
      return res.render("company_profile", {
        user: company,
        profileError: null,
        profileSuccess: null,
        settingsError: null,
        settingsSuccess: null,
        passwordError: "Password must be at least 8 characters and include 1 uppercase, 1 lowercase, 1 number, and 1 special character.",
        passwordSuccess: null
      });
    }

    if (newPassword !== renewPassword) {
      return res.render("company_profile", {
        user: company,
        profileError: null,
        profileSuccess: null,
        settingsError: null,
        settingsSuccess: null,
        passwordError: "New passwords do not match.",
        passwordSuccess: null
      });
    }

    company.password = newPassword;
    await company.save();

    res.render("company_profile", {
      user: company,
      profileError: null,
      profileSuccess: null,
      settingsError: null,
      settingsSuccess: null,
      passwordError: null,
      passwordSuccess: "Password changed successfully."
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).render("company_profile", {
      user: {},
      profileError: null,
      profileSuccess: null,
      settingsError: null,
      settingsSuccess: null,
      passwordError: "Server error. Please try again later.",
      passwordSuccess: null
    });
  }
});

// GET: Signout route
app.get("/signout", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

// Start server
const PORT = 5050;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
