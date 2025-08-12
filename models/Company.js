const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  legalName: { type: String, required: true },
  gstNumber: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  password: String,
  gstCertificate: { type: String, required: false }, // store file path
  signatory: { type: String, required: false },      // store file path
  notifyChanges: Boolean,
  notifyProducts: Boolean,
  notifyPromos: Boolean
});

module.exports = mongoose.model("Company", companySchema, "companyDB");
