import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import multer from "multer";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Read Firebase config dynamically to avoid import assertions or ESM loading issues
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = null;
if (fs.existsSync(firebaseConfigPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  } catch (e) {
    console.error("Error reading firebase-applet-config.json:", e);
  }
}

// Initialize Firestore on Backend
let db: any = null;
if (firebaseConfig) {
  try {
    const dbApp = initializeApp(firebaseConfig);
    db = getFirestore(dbApp, firebaseConfig.firestoreDatabaseId || "(default)");
    console.log("[Aurelius Server] Firestore Database connected successfully.");
  } catch (e) {
    console.error("Error initializing Firestore in backend:", e);
  }
}

// Ensure uploads folder exists in the workspace
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WEBP image formats are supported."));
    }
  }
});

const uploadMulti = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit to support videos
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/quicktime", "video/webm", "video/ogg"
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Supported formats: JPEG, PNG, WEBP, GIF, MP4, MOV, WEBM, OGG."));
    }
  }
});

// Serve uploaded files statically
app.use("/uploads", express.static(uploadsDir));

// Initialize Google Gen AI client lazily to prevent startup crashes if GEMINI_API_KEY is not set yet
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Middleware for parsing JSON
app.use(express.json());

// Custom Request/Response Tracing Middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const originalSend = res.send;
  const originalJson = res.json;
  const url = req.originalUrl || req.url;

  console.log(`[Aurelius Server Trace] >>> INCOMING REQUEST: ${req.method} ${url}`);
  console.log(`[Aurelius Server Trace] Request Headers:`, JSON.stringify(req.headers, null, 2));

  if (req.body && Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = "********";
    console.log(`[Aurelius Server Trace] Request Payload:`, JSON.stringify(safeBody, null, 2));
  } else {
    console.log(`[Aurelius Server Trace] Request Payload: Empty`);
  }

  // Intercept json responses
  res.json = function (body): express.Response {
    console.log(`[Aurelius Server Trace] <<< OUTGOING JSON RESPONSE: ${req.method} ${url} | Status: ${res.statusCode}`);
    console.log(`[Aurelius Server Trace] Response Headers:`, JSON.stringify(res.getHeaders(), null, 2));
    
    // Ensure Content-Type is always application/json
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    try {
      console.log(`[Aurelius Server Trace] Response Body:`, JSON.stringify(body, null, 2).substring(0, 2000));
    } catch (e) {
      console.log(`[Aurelius Server Trace] Response Body: [Failed to stringify response body]`);
    }

    return originalJson.apply(res, arguments as any);
  };

  // Intercept send responses
  res.send = function (body): express.Response {
    console.log(`[Aurelius Server Trace] <<< OUTGOING SEND RESPONSE: ${req.method} ${url} | Status: ${res.statusCode}`);
    console.log(`[Aurelius Server Trace] Response Headers:`, JSON.stringify(res.getHeaders(), null, 2));

    if (url.startsWith("/api/")) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }

    try {
      if (typeof body === "string") {
        console.log(`[Aurelius Server Trace] Response Body (String):`, body.substring(0, 1000));
      } else {
        console.log(`[Aurelius Server Trace] Response Body (Other):`, String(body).substring(0, 1000));
      }
    } catch (e) {
      console.log(`[Aurelius Server Trace] Response Body: [Failed to print]`);
    }

    return originalSend.apply(res, arguments as any);
  };

  next();
});

// API: Health Check
app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
});

// API: Get custom products from Firestore
app.get("/api/products", async (req, res) => {
  try {
    if (!db) {
      console.warn("[Aurelius Server] WARNING: Database not initialized. Returning empty product dataset.");
      return res.status(200).json({
        success: true,
        message: "Database not initialized yet. Returning empty catalog.",
        data: []
      });
    }
    const querySnapshot = await getDocs(collection(db, "products"));
    const products: any[] = [];
    querySnapshot.forEach((docSnap) => {
      products.push({ id: docSnap.id, ...docSnap.data() });
    });
    res.status(200).json({
      success: true,
      message: "Products retrieved successfully from Firestore",
      data: products
    });
  } catch (error: any) {
    console.error("[Aurelius Server Error] Error getting custom products. Stack trace:", error.stack || error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve products."
    });
  }
});

// API: Add a new custom product with uploaded images and video
app.post("/api/products", uploadMulti.fields([{ name: "images", maxCount: 10 }, { name: "video", maxCount: 1 }]), async (req, res) => {
  try {
    const { 
      name, price, originalPrice, description, category, subcategory, 
      features, laptopCompatibility, waterResistance, 
      dimensions, weight, capacity, careInstructions, inStock,
      variantColors, variantColorsHex
    } = req.body;

    if (!name || !price || !description || !category) {
      return res.status(400).json({
        success: false,
        error: "Missing required product fields: name, price, description, category"
      });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    
    let uploadedImages: string[] = [];
    let uploadedVideo: string = "";

    if (files) {
      if (files["images"]) {
        uploadedImages = files["images"].map(f => `/uploads/${f.filename}`);
      }
      if (files["video"] && files["video"].length > 0) {
        uploadedVideo = `/uploads/${files["video"][0].filename}`;
      }
    }

    if (uploadedImages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one product image is required."
      });
    }

    const parsedPrice = parseFloat(price);
    const parsedOriginalPrice = originalPrice ? parseFloat(originalPrice) : undefined;
    const parsedStock = inStock ? parseInt(inStock) : 10;

    const productData: any = {
      name,
      price: isNaN(parsedPrice) ? 0 : parsedPrice,
      description,
      category,
      subcategory: subcategory || "Heritage Craft",
      image: uploadedImages[0],
      images: uploadedImages,
      features: features ? (Array.isArray(features) ? features : features.split(",").map((f: string) => f.trim())) : ["Premium full-grain leather", "Meticulous artisan details"],
      variantColors: variantColors ? (Array.isArray(variantColors) ? variantColors : variantColors.split(",").map((c: string) => c.trim())) : ["Classic Amber", "Saddle Tan", "Executive Black"],
      variantColorsHex: variantColorsHex ? (Array.isArray(variantColorsHex) ? variantColorsHex : variantColorsHex.split(",").map((h: string) => h.trim())) : ["#C5A05A", "#8B5A2B", "#111111"],
      laptopCompatibility: laptopCompatibility || "Integrated slot fits up to 15-inch models",
      waterResistance: waterResistance || "Moderate splash protection",
      dimensions: dimensions || "45cm L x 22cm W x 25cm H",
      weight: weight || "1.4 kg",
      capacity: capacity || "28 Litres",
      careInstructions: careInstructions || "Apply organic leather balm and buff clean with a cotton cloth.",
      inStock: isNaN(parsedStock) ? 10 : parsedStock,
      rating: 5.0,
      reviewsCount: 1,
      createdAt: new Date().toISOString()
    };

    if (parsedOriginalPrice !== undefined && !isNaN(parsedOriginalPrice)) {
      productData.originalPrice = parsedOriginalPrice;
    }

    if (uploadedVideo) {
      productData.video = uploadedVideo;
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Database not initialized yet."
      });
    }

    const docRef = await addDoc(collection(db, "products"), productData);
    const addedProduct = { id: docRef.id, ...productData };
    
    res.status(201).json({
      success: true,
      message: `Masterpiece "${name}" added successfully to database`,
      data: addedProduct,
      product: addedProduct // keeping product field for front-end compatibility
    });
  } catch (error: any) {
    console.error("[Aurelius Server Error] Error creating custom product. Stack trace:", error.stack || error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create product."
    });
  }
});

// API: Edit/Update an existing custom product in Firestore
app.put("/api/products/:id", uploadMulti.fields([{ name: "images", maxCount: 10 }, { name: "video", maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, price, originalPrice, description, category, subcategory, 
      features, laptopCompatibility, waterResistance, 
      dimensions, weight, capacity, careInstructions, inStock,
      variantColors, variantColorsHex,
      existingImages, existingVideo // arrays or string lists representing existing images/video to preserve
    } = req.body;

    if (!name || !price || !description || !category) {
      return res.status(400).json({
        success: false,
        error: "Missing required product fields: name, price, description, category"
      });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    
    let uploadedImages: string[] = [];
    let uploadedVideo: string = "";

    if (files) {
      if (files["images"]) {
        uploadedImages = files["images"].map(f => `/uploads/${f.filename}`);
      }
      if (files["video"] && files["video"].length > 0) {
        uploadedVideo = `/uploads/${files["video"][0].filename}`;
      }
    }

    // Process existing images
    let preservedImages: string[] = [];
    if (existingImages) {
      if (Array.isArray(existingImages)) {
        preservedImages = existingImages;
      } else if (typeof existingImages === "string") {
        try {
          preservedImages = JSON.parse(existingImages);
        } catch {
          preservedImages = existingImages.split(",").map(i => i.trim()).filter(Boolean);
        }
      }
    }

    const finalImages = [...preservedImages, ...uploadedImages];

    if (finalImages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Product requires at least one image."
      });
    }

    let finalVideo = uploadedVideo;
    if (!finalVideo && existingVideo) {
      finalVideo = existingVideo;
    }

    const parsedPrice = parseFloat(price);
    const parsedOriginalPrice = originalPrice ? parseFloat(originalPrice) : undefined;
    const parsedStock = inStock ? parseInt(inStock) : 10;

    const productData: any = {
      name,
      price: isNaN(parsedPrice) ? 0 : parsedPrice,
      description,
      category,
      subcategory: subcategory || "Heritage Craft",
      image: finalImages[0],
      images: finalImages,
      features: features ? (Array.isArray(features) ? features : features.split(",").map((f: string) => f.trim())) : ["Premium full-grain leather", "Meticulous artisan details"],
      variantColors: variantColors ? (Array.isArray(variantColors) ? variantColors : variantColors.split(",").map((c: string) => c.trim())) : ["Classic Amber", "Saddle Tan", "Executive Black"],
      variantColorsHex: variantColorsHex ? (Array.isArray(variantColorsHex) ? variantColorsHex : variantColorsHex.split(",").map((h: string) => h.trim())) : ["#C5A05A", "#8B5A2B", "#111111"],
      laptopCompatibility: laptopCompatibility || "Integrated slot fits up to 15-inch models",
      waterResistance: waterResistance || "Moderate splash protection",
      dimensions: dimensions || "45cm L x 22cm W x 25cm H",
      weight: weight || "1.4 kg",
      capacity: capacity || "28 Litres",
      careInstructions: careInstructions || "Apply organic leather balm and buff clean with a cotton cloth.",
      inStock: isNaN(parsedStock) ? 10 : parsedStock,
      updatedAt: new Date().toISOString()
    };

    if (parsedOriginalPrice !== undefined && !isNaN(parsedOriginalPrice)) {
      productData.originalPrice = parsedOriginalPrice;
    } else {
      productData.originalPrice = null;
    }

    if (finalVideo) {
      productData.video = finalVideo;
    } else {
      productData.video = null;
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Database not initialized yet."
      });
    }

    await updateDoc(doc(db, "products", id), productData);
    const updatedProduct = { id, ...productData };

    res.status(200).json({
      success: true,
      message: `Masterpiece "${name}" updated successfully in database`,
      data: updatedProduct,
      product: updatedProduct // keeping product field for front-end compatibility
    });
  } catch (error: any) {
    console.error("[Aurelius Server Error] Error editing custom product. Stack trace:", error.stack || error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to edit product."
    });
  }
});

// API: Delete a custom product from Firestore
app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Database not initialized"
      });
    }
    await deleteDoc(doc(db, "products", id));
    res.status(200).json({
      success: true,
      message: "Product deleted successfully from database",
      data: { id }
    });
  } catch (error: any) {
    console.error("[Aurelius Server Error] Error deleting custom product. Stack trace:", error.stack || error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete product."
    });
  }
});

// API: AI Personal Shopper (Luxury Concierge Chat)
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, contextProduct } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid or missing messages array." });
    }

    // Format chat history for Gemini
    // Limit to last 15 messages for token economy
    const recentMessages = messages.slice(-15);
    
    // We can compile history into a standard single prompt context or run as chats.sendMessage.
    // To make it highly reliable and robust, we format a single system instruction + combined history.
    let systemInstruction = `You are the Aurelius Luxury Concierge, an elite personal shopper and leather heritage advisor for "Aurelius" — a world-class luxury leather brand competing with the finest Italian ateliers and heritage houses. 
Your personality is:
- Extremely sophisticated, polished, refined, and confident.
- Warm, helpful, and highly professional (like an estate manager, private club host, or premium leather artisan).
- Knowledgeable about leather materials (Crazy Horse leather, Full-grain veg-tan, Suede), leather preservation (protecting from water, conditioning with natural oils, avoiding direct high heat), and lifestyle travel packing.
- Avoid low-quality sales pitches or generic promotional speak. Instead, offer timeless, poetic yet highly practical advice.

Aurelius Collections details:
1. Crazy Horse Leather Travel Bags:
   - "Leathfocus Cowhide Travel Bag" ($245): Crazy Horse natural leather, large capacity duffle bag with soft zipper closure and vintage style, integrated sleeve fits 15.6" laptops.
   - "Aurelius Navigator Duffel" ($420): Rich Crazy Horse leather, 45L capacity, perfect cabin carry-on with solid brass hardware.
   - "Aurelius Overlander Weekend Bag" ($480): Deep Espresso Brown full-grain leather, shoe compartment, luxurious canvas lining.
   - "Aurelius Executive Briefcase" ($350): Designed for 16-inch laptops, brushed gold buckles, rear luggage strap.
2. Handmade Leather Shoes:
   - "Aurelius Sovereign Oxford" ($280): British classic brogues, Goodyear welted, vegetable-tanned premium leather.
   - "Aurelius Nomad Leather Sneaker" ($190): Matte black and tan variants, high-density comfort memory insoles, Italian leather.
   - "Aurelius Chelsea Boot" ($310): Rich cognac suede, double elastic gusset, durable rubber-injected leather outsole.
3. Premium Accessories:
   - "Aurelius Heritage Wallet" ($85): Bifold, RFID-blocking, 8 card slots, slim profile.
   - "Aurelius Aviator Watch" ($380): Chronograph, brushed copper bezel, crazy horse tan leather strap, sapphire crystal glass.
   - "Aurelius Leather Care Kit" ($35): Premium organic beeswax conditioner, horsehair brush, microfibre polishing cloth.

When recommending products, guide them to these specific Aurelius models. Include their exquisite features and price points. If the user asks about care, recommend the Aurelius Leather Care Kit.`;

    if (contextProduct) {
      systemInstruction += `\n\nThe user is currently viewing: "${contextProduct.name}" (${contextProduct.category}, $${contextProduct.price}). Tailor your response or welcome to mention this magnificent piece first!`;
    }

    // Format the history for model input
    const formattedContents = recentMessages.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    const response = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ content: response.text });
  } catch (error: any) {
    console.error("Error in AI Chat:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI Concierge." });
  }
});

// API: AI Product Description Generator (Admin Panel Feature)
app.post("/api/ai/describe-product", async (req, res) => {
  try {
    const { name, category, keyFeatures, tone = "luxurious" } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: "Product Name and Category are required." });
    }

    const prompt = `Write an exquisite, high-end editorial product description for a premium leather item.
Product Name: "${name}"
Category: "${category}"
Key Materials/Features: "${keyFeatures || 'Premium full-grain leather, meticulous hand-stitching, brass hardware'}"
Tone: "${tone}"

Format the output as a beautiful piece of copywriting:
1. An elegant, narrative intro paragraph describing the spirit of the item (timeless craftsmanship, confidence, luxury lifestyle).
2. A bulleted list of 3-4 meticulously described luxurious technical features (e.g. "Solid Brass Accents", "Crazy Horse Patina Journey", "Ergonomic Balance").
3. A closing "Legacy Note" stating how this product inherits character over decades of travel.

Do not use overly dramatic marketing phrases (e.g., "Revolutionize your wardrobe"). Keep it grounded in Rolls-Royce class and Apple-level clarity.`;

    const response = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
      }
    });

    res.json({ description: response.text });
  } catch (error: any) {
    console.error("Error in AI Describe Product:", error);
    res.status(500).json({ error: error.message || "Failed to generate product description." });
  }
});

// API: AI Smart Search (Extracting categories, keywords, and tags to enable typo correction and smart suggestion)
app.post("/api/ai/smart-search", async (req, res) => {
  const { query } = req.body;
  try {
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const prompt = `Analyze the following search query from a customer on a luxury leather boutique: "${query}".
Categorize it, extract keywords, and predict intention. Provide synonyms and correct minor typos to match our collections: "bags", "shoes", "wallets", "watches", "care".

Return the result strictly as a JSON object with this exact schema:
{
  "correctedQuery": "corrected text or original if perfect",
  "category": "travel bags" | "shoes" | "accessories" | "care" | "all",
  "tags": ["travel", "business", "minimalist", "gift", "premium", "formal", "casual", etc. list up to 4 tags],
  "intent": "purchase" | "browse" | "care_advice" | "gift_finding",
  "suggestedColors": ["saddle brown", "matte black", "espresso", "cognac", "tan", "any"]
}`;

    const response = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correctedQuery: { type: Type.STRING },
            category: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            intent: { type: Type.STRING },
            suggestedColors: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["correctedQuery", "category", "tags", "intent", "suggestedColors"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Error in AI Smart Search:", error);
    // Graceful fallback with standard search matching if Gemini is offline
    res.json({
      correctedQuery: query,
      category: "all",
      tags: [],
      intent: "browse",
      suggestedColors: ["any"]
    });
  }
});

// API: Leather Care Diagnosis Tool
app.post("/api/ai/diagnose-care", async (req, res) => {
  try {
    const { material, issueType, description } = req.body;

    if (!material || !issueType || !description) {
      return res.status(400).json({ error: "Material, Issue Type, and Description are required." });
    }

    const prompt = `You are the Aurelius Chief Restoration Officer and Master Leather Artisan at our flagship sun-drenched Tuscan workshop in Florence.
    A client has approached you with a distress call regarding their luxury item. 
    
    Item Material: "${material}"
    Type of Damage/Issue: "${issueType}"
    Client's Description: "${description}"
    
    Analyze the situation and provide an expert, specific, reassuring, and step-by-step restoration plan.
    Keep your tone sophisticated, warm, professional, and authoritative—reflecting centuries of luxury leather mastery.
    
    Structure your answer in beautiful Markdown with the following distinct sections:
    
    ### 1. 🔍 Damage Analysis & Fiber Diagnosis
    Explain what happened on a physical/biological level to this specific type of leather (e.g. how the liquid affected aniline pores, how a scratch shifted pull-up waxes, or how a stain flattened suede nap).
    
    ### 2. 🛠️ Bespoke Restoration Protocol (Step-by-Step)
    Provide 3 to 5 clear, numbered, easy-to-follow restoration steps. Make them specific to the material and damage. Include warnings of what NOT to do.
    
    ### 3. 🎒 Suggested Tools & Care Kit
    List the essential tools needed for this treatment (recommend the "Aurelius Leather Care Kit" featuring organic beeswax, horsehair brush, and microfiber cloth if applicable, or highly specific home safe remedies like clean warm moisture, cornstarch for grease, steam for suede).
    
    ### 4. 📜 Artisan's Heritage Note
    Conclude with an elegant, poetic note of comfort about how leather lives, breathes, and carries the scars of a well-traveled life as an emerging unique patina, rather than a defect.
    
    Ensure your advice is extremely safe. NEVER suggest harsh chemicals, alcohol, or wire brushes on delicate smooth surfaces.`;

    const response = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    res.json({ diagnosis: response.text });
  } catch (error: any) {
    console.error("Error in AI Leather Care Diagnosis:", error);
    res.status(500).json({ error: error.message || "An error occurred during diagnosis. Please try again." });
  }
});

// Global Error Handler for API routes to always return JSON instead of HTML
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Aurelius Server Error]:", err);
  res.status(err.status || err.statusCode || 500).json({
    success: false,
    error: err.message || "An unexpected server-side error occurred."
  });
});

// Vite Middleware for development mode, otherwise serve static files
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve index.html for all non-API GET requests in production (Express v4)
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Aurelius Server] Luxury eCommerce backend running on http://localhost:${PORT}`);
  });
};

startServer();
