require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const connectDB    = require("./db");
const User         = require("../modules/users/user.model");
const Admin        = require("../modules/admin/admin.model");
const University   = require("../modules/universities/university.model");

const seed = async () => {
  await connectDB();
  console.log("Starting seed...");

  // ── 3 Admin Accounts ──
  const admins = [
    { firstName: "أدمن", secondName: "النظام", familyName: "الأول",  email: "admin1@edu.com", password: "123456789" },
    { firstName: "أدمن", secondName: "النظام", familyName: "الثاني", email: "admin2@edu.com", password: "123456789" },
    { firstName: "أدمن", secondName: "النظام", familyName: "الثالث", email: "admin3@edu.com", password: "123456789" },
  ];

  for (const data of admins) {
    const exists = await User.findOne({ email: data.email });
    if (exists) { console.log(`  ⏭  Admin exists: ${data.email}`); continue; }
    const user = await User.create({ ...data, role: "admin", isActive: true, isVerified: true });
    await Admin.create({ userId: user._id });
    console.log(`  ✅ Created admin: ${data.email} / ${data.password}`);
  }

  // ── Sample Universities ──
  const universities = [
    { name: "جامعة الملك عبدالعزيز", nameEn: "King Abdulaziz University",  city: "جدة" },
    { name: "جامعة الملك سعود",       nameEn: "King Saud University",       city: "الرياض" },
    { name: "جامعة الملك فهد",        nameEn: "KFUPM",                      city: "الظهران" },
    { name: "جامعة أم القرى",         nameEn: "Umm Al-Qura University",      city: "مكة المكرمة" },
    { name: "جامعة المدينة",          nameEn: "Madinah University",          city: "المدينة المنورة" },
  ];

  const adminUser = await User.findOne({ role: "admin" });
  for (const data of universities) {
    const exists = await University.findOne({ name: data.name });
    if (exists) { console.log(`  ⏭  University exists: ${data.name}`); continue; }
    await University.create({ ...data, createdBy: adminUser._id, isActive: true });
    console.log(`  ✅ Created university: ${data.name}`);
  }

  console.log("\n✅ Seed completed!");
  console.log("\nAdmin Credentials:");
  console.log("  admin1@edu.com  / 123456789");
  console.log("  admin2@edu.com  / 123456789");
  console.log("  admin3@edu.com  / 123456789");
  console.log("\nNote: New students automatically receive 250 MET points (= 500 USD value)");
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});