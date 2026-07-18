import React, { useState } from "react";
import { 
  DollarSign, ShoppingCart, Users, Sparkles, Flame, Copy, ClipboardCheck, 
  ArrowUpRight, AlertTriangle, RefreshCw, BarChart2, TrendingUp, Lock, 
  Unlock, Plus, Trash2, Database, Upload, FileCode, CheckCircle2, ChevronRight,
  Briefcase, Activity, Check, MapPin, Package, Clock, Edit, FileEdit
} from "lucide-react";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, 
  BarChart, Bar, Cell, CartesianGrid, PieChart, Pie, Legend 
} from "recharts";
import { Product } from "../types";
import { DEFAULT_USER } from "../data";
import { AureliusLogger } from "../utils/AureliusLogger";

// Mock static analytics datasets
const REVENUE_DATA = [
  { day: "Mon", revenue: 4200 },
  { day: "Tue", revenue: 5800 },
  { day: "Wed", revenue: 8100 },
  { day: "Thu", revenue: 7500 },
  { day: "Fri", revenue: 11200 },
  { day: "Sat", revenue: 15400 },
  { day: "Sun", revenue: 13900 }
];

const COLLECTION_SALES = [
  { name: "Travel Bags", sales: 24, fill: "#7A4E2D" },
  { name: "Shoes", sales: 18, fill: "#B98B5D" },
  { name: "Accessories", sales: 32, fill: "#C5A05A" }
];

interface AdminPanelProps {
  products?: Product[];
  onProductAdded?: (newProduct: Product) => void;
  onProductDeleted?: (id: string) => void;
  onProductUpdated?: (updatedProduct: Product) => void;
}

export default function AdminPanel({ 
  products = [], 
  onProductAdded, 
  onProductDeleted,
  onProductUpdated 
}: AdminPanelProps) {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Sub-navigation tabs
  const [activeTab, setActiveTab] = useState<"analytics" | "inventory" | "deployment">("analytics");

  // Dynamic order pipeline tracking
  const [activeOrderStages, setActiveOrderStages] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("aurelius_active_stages");
    return saved ? JSON.parse(saved) : { "AUR-3022": 1, "AUR-9204": 4, "AUR-8113": 4 };
  });

  const handleUpdateOrderStage = (orderId: string, stageNum: number) => {
    const nextStages = { ...activeOrderStages, [orderId]: stageNum };
    setActiveOrderStages(nextStages);
    localStorage.setItem("aurelius_active_stages", JSON.stringify(nextStages));
  };

  // AI Copywriter states
  const [prodName, setProdName] = useState("");
  const [prodCat, setProdCat] = useState("Travel Bags");
  const [prodFeatures, setProdFeatures] = useState("");
  const [prodTone, setProdTone] = useState("luxurious");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [copiedAI, setCopiedAI] = useState(false);

  // Form states for creating / editing products
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formOriginalPrice, setFormOriginalPrice] = useState("");
  const [formCategory, setFormCategory] = useState<"bags" | "shoes" | "accessories">("bags");
  const [formSubcategory, setFormSubcategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formInStock, setFormInStock] = useState("10");
  const [formDimensions, setFormDimensions] = useState("");
  const [formWeight, setFormWeight] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formCare, setFormCare] = useState("");
  const [formFeatures, setFormFeatures] = useState("");
  const [formVariantColors, setFormVariantColors] = useState("");
  const [formVariantColorsHex, setFormVariantColorsHex] = useState("");

  // Multi-image upload states (up to 10 files)
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // Single video upload states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // Preservation states for existing assets when editing
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingVideo, setExistingVideo] = useState<string>("");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Copy to clipboard helpers
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [copiedPHP, setCopiedPHP] = useState(false);

  // Low stock mock items
  const lowStockItems = [
    { id: "overlander-weekend", name: "Aurelius Overlander Weekend Bag", qty: 5 },
    { id: "aviator-watch", name: "Aurelius Aviator Watch", qty: 8 },
    { id: "chelsea-boot", name: "Aurelius Chelsea Boot", qty: 9 }
  ];

  // SQL code to export
  const SQL_CODE = `CREATE TABLE IF NOT EXISTS \`products\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`title\` VARCHAR(255) NOT NULL,
  \`price\` DECIMAL(10,2) NOT NULL,
  \`description\` TEXT NOT NULL,
  \`image_path\` VARCHAR(255) NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

  // Secure PHP upload code to export
  const PHP_CODE = `<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'your_cpanel_db_user');
define('DB_PASS', 'your_cpanel_db_password');
define('DB_NAME', 'your_cpanel_db_name');

$message = '';
$messageType = '';

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Secure input sanitization and validation
    $title = filter_input(INPUT_POST, 'title', FILTER_SANITIZE_SPECIAL_CHARS);
    $price = filter_input(INPUT_POST, 'price', FILTER_VALIDATE_FLOAT);
    $description = filter_input(INPUT_POST, 'description', FILTER_SANITIZE_SPECIAL_CHARS);

    if (empty($title) || $price === false || empty($description)) {
        $message = "Error: Invalid or missing text fields.";
        $messageType = "error";
    } else {
        // 2. Secure file upload handling
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $fileTmpPath = $_FILES['image']['tmp_name'];
            $fileName = $_FILES['image']['name'];
            $fileSize = $_FILES['image']['size'];
            $fileType = $_FILES['image']['type'];
            
            // Extract file extension and validate
            $fileNameCmps = explode(".", $fileName);
            $fileExtension = strtolower(end($fileNameCmps));
            
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
            $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
            
            // Verify extension and real mime type (prevents PHP shell upload)
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $fileTmpPath);
            finfo_close($finfo);

            if (in_array($fileExtension, $allowedExtensions) && in_array($mimeType, $allowedMimeTypes)) {
                // Limit file size to 5MB
                if ($fileSize < 5 * 1024 * 1024) {
                    // Create unique file name to prevent collision
                    $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
                    
                    // Create upload directory if not exists
                    $uploadFileDir = './uploads/';
                    if (!is_dir($uploadFileDir)) {
                        mkdir($uploadFileDir, 0755, true);
                    }
                    
                    $dest_path = $uploadFileDir . $newFileName;
                    
                    if (move_uploaded_file($fileTmpPath, $dest_path)) {
                        // 3. Insert securely using PDO with prepared statements
                        try {
                            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
                            $options = [
                                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                                PDO::ATTR_EMULATE_PREPARES   => false,
                            ];
                            
                            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
                            
                            $sql = "INSERT INTO products (title, price, description, image_path) VALUES (:title, :price, :description, :image_path)";
                            $stmt = $pdo->prepare($sql);
                            
                            $stmt->execute([
                                ':title' => $title,
                                ':price' => $price,
                                ':description' => $description,
                                ':image_path' => $dest_path
                            ]);
                            
                            $message = "Masterpiece successfully uploaded and saved into cPanel MySQL Database!";
                            $messageType = "success";
                        } catch (PDOException $e) {
                            $message = "Database Error: " . $e->getMessage();
                            $messageType = "error";
                        }
                    } else {
                        $message = "Error: There was an issue moving the file to the uploads directory.";
                        $messageType = "error";
                    }
                } else {
                    $message = "Error: File size exceeds the 5MB limit.";
                    $messageType = "error";
                }
            } else {
                $message = "Error: Uploaded file is not a valid image. Only JPG, PNG, and WEBP allowed.";
                $messageType = "error";
            }
        } else {
            $message = "Error: Image file is required or upload error occurred.";
            $messageType = "error";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aurelius Atelier - cPanel Upload Portal</title>
    <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #111; color: #fff; padding: 40px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 30px; border-radius: 8px; border: 1px solid #c5a05a; }
        h1 { font-size: 24px; color: #c5a05a; text-transform: uppercase; margin-top: 0; text-align: center; }
        .alert { padding: 15px; border-radius: 4px; margin-bottom: 20px; font-size: 14px; }
        .alert-success { background: #1b4332; border: 1px solid #2d6a4f; color: #d8f3dc; }
        .alert-error { background: #5c1e1e; border: 1px solid #7c2d2d; color: #fcd5d5; }
        label { display: block; margin-bottom: 5px; font-weight: bold; font-size: 12px; color: #aaa; text-transform: uppercase; }
        input[type="text"], input[type="number"], textarea, input[type="file"] {
            width: 100%; padding: 10px; margin-bottom: 20px; background: #111; border: 1px solid #333; border-radius: 4px; color: #fff; box-sizing: border-box;
        }
        button { width: 100%; padding: 12px; background: #c5a05a; border: none; color: #000; font-weight: bold; border-radius: 4px; cursor: pointer; text-transform: uppercase; }
        button:hover { background: #a5673f; color: #fff; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Inventory Upload Portal</h1>
        <?php if (!empty($message)): ?>
            <div class="alert alert-<?php echo $messageType; ?>"><?php echo $message; ?></div>
        <?php endif; ?>
        <form action="" method="POST" enctype="multipart/form-data">
            <label for="title">Product Title</label>
            <input type="text" id="title" name="title" required placeholder="e.g. Aurelius Sovereign Duffel">

            <label for="price">Price ($)</label>
            <input type="number" step="0.01" id="price" name="price" required placeholder="e.g. 295.00">

            <label for="description">Description</label>
            <textarea id="description" name="description" rows="5" required placeholder="Describe materials, leather type, and care..."></textarea>

            <label for="image">Product Image File</label>
            <input type="file" id="image" name="image" accept="image/*" required>

            <button type="submit">Submit Masterpiece</button>
        </form>
    </div>
</body>
</html>`;

  // Authenticate password
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "aurelius2026") {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Invalid Security Key. Please verify corporate access credentials.");
    }
  };

  // Call the server-side API to generate copywriting via Gemini
  const handleGenerateDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    setIsGenerating(true);
    setGeneratedDescription("");
    try {
      const response = await fetch("/api/ai/describe-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prodName,
          category: prodCat,
          keyFeatures: prodFeatures,
          tone: prodTone
        })
      });

      const data = await response.json();
      if (response.ok) {
        setGeneratedDescription(data.description);
      } else {
        throw new Error(data.error || "Failed to generate");
      }
    } catch (err: any) {
      console.error("AI descrip failure:", err);
      setGeneratedDescription(`Atelier Error: Failed to invoke our digital leather scribe.\n\nDetails: ${err.message || "Endpoint error"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAI = () => {
    navigator.clipboard.writeText(generatedDescription);
    setCopiedAI(true);
    setTimeout(() => setCopiedAI(false), 3000);
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SQL_CODE);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 3000);
  };

  const handleCopyPHP = () => {
    navigator.clipboard.writeText(PHP_CODE);
    setCopiedPHP(true);
    setTimeout(() => setCopiedPHP(false), 3000);
  };

  // Handle multi-image selection and generate previews (max 10)
  const handleMultiImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      const totalImagesCount = filesArray.length + imageFiles.length + existingImages.length;
      if (totalImagesCount > 10) {
        alert("A luxury catalog entry may display up to 10 masterpiece photographs concurrently.");
        return;
      }

      const nextFiles = [...imageFiles, ...filesArray];
      setImageFiles(nextFiles);

      const nextPreviews = filesArray.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...nextPreviews]);
    }
  };

  const handleRemoveNewImage = (idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  // Handle single video selection
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
  };

  const handleRemoveExistingImage = (imgSrc: string) => {
    setExistingImages(prev => prev.filter(src => src !== imgSrc));
  };

  // Switch form to EDIT mode for a specific product
  const handleEditProduct = (p: Product) => {
    setEditingProduct(p);
    setUploadError(null);
    setUploadSuccess(null);

    // Populate form fields
    setFormName(p.name);
    setFormPrice(p.price.toString());
    setFormOriginalPrice(p.originalPrice ? p.originalPrice.toString() : "");
    setFormCategory(p.category);
    setFormSubcategory(p.subcategory || "");
    setFormDescription(p.description);
    setFormInStock(p.inStock.toString());
    setFormDimensions(p.dimensions || "");
    setFormWeight(p.weight || "");
    setFormCapacity(p.capacity || "");
    setFormCare(p.careInstructions || "");
    setFormFeatures(p.features ? p.features.join(", ") : "");
    setFormVariantColors(p.variantColors ? p.variantColors.join(", ") : "");
    setFormVariantColorsHex(p.variantColorsHex ? p.variantColorsHex.join(", ") : "");

    // Populate existing assets
    setExistingImages(p.images || [p.image]);
    setExistingVideo(p.video || "");

    // Reset newly-selected files
    setImageFiles([]);
    setImagePreviews([]);
    setVideoFile(null);
    setVideoPreview(null);

    // Scroll up to the form smoothly
    const formEl = document.getElementById("admin-form-anchor");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Cancel edit mode and reset form
  const handleCancelEdit = () => {
    setEditingProduct(null);
    
    // Clear all fields
    setFormName("");
    setFormPrice("");
    setFormOriginalPrice("");
    setFormCategory("bags");
    setFormSubcategory("");
    setFormDescription("");
    setFormInStock("10");
    setFormDimensions("");
    setFormWeight("");
    setFormCapacity("");
    setFormCare("");
    setFormFeatures("");
    setFormVariantColors("");
    setFormVariantColorsHex("");

    setImageFiles([]);
    setImagePreviews([]);
    setVideoFile(null);
    setVideoPreview(null);
    setExistingImages([]);
    setExistingVideo("");
    setUploadError(null);
    setUploadSuccess(null);
  };

  // Handle uploading or editing product
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!formName || !formPrice || !formDescription || !formCategory) {
      setUploadError("Please supply all required fields: Name, Price, Description, and Category.");
      return;
    }

    if (!editingProduct && imageFiles.length === 0) {
      setUploadError("Please upload at least one product image to publish your masterpiece.");
      return;
    }

    if (editingProduct && existingImages.length === 0 && imageFiles.length === 0) {
      setUploadError("An active listing requires at least one product image.");
      return;
    }

    setIsUploading(true);
    setUploadSuccess(null);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("name", formName);
      formData.append("price", formPrice);
      if (formOriginalPrice) {
        formData.append("originalPrice", formOriginalPrice);
      }
      formData.append("category", formCategory);
      formData.append("subcategory", formSubcategory || "Heritage Craft");
      formData.append("description", formDescription);
      formData.append("inStock", formInStock);
      formData.append("dimensions", formDimensions || "Standard Size");
      formData.append("weight", formWeight || "1.2 kg");
      formData.append("capacity", formCapacity || "N/A");
      formData.append("careInstructions", formCare || "Apply beeswax conditioner annually.");
      formData.append("features", formFeatures || "Genuine Vegetable-Tanned Full Grain Hide");
      
      if (formVariantColors) {
        formData.append("variantColors", formVariantColors);
      }
      if (formVariantColorsHex) {
        formData.append("variantColorsHex", formVariantColorsHex);
      }

      // Append multi-images (up to 10)
      imageFiles.forEach((file) => {
        formData.append("images", file);
      });

      // Append video (if chosen)
      if (videoFile) {
        formData.append("video", videoFile);
      }

      // Detailed logging for request payload (convert form data to keys representation)
      const payloadLog: Record<string, any> = {};
      formData.forEach((value, key) => {
        if (value instanceof File) {
          payloadLog[key] = `File: ${value.name} (${value.type}, ${value.size} bytes)`;
        } else {
          payloadLog[key] = value;
        }
      });

      let response;
      let reqMethod = "POST";
      let reqUrl = "/api/products";

      if (editingProduct) {
        // Edit Mode: Send PUT
        reqMethod = "PUT";
        reqUrl = `/api/products/${editingProduct.id}`;
        formData.append("existingImages", JSON.stringify(existingImages));
        formData.append("existingVideo", existingVideo || "");
        
        // Update payloadLog for log trace
        payloadLog["existingImages"] = JSON.stringify(existingImages);
        payloadLog["existingVideo"] = existingVideo || "";

        response = await fetch(reqUrl, {
          method: "PUT",
          body: formData
        });
      } else {
        // Create Mode: Send POST
        response = await fetch(reqUrl, {
          method: "POST",
          body: formData
        });
      }

      const data = await safeParseJSON(response, { url: reqUrl, method: reqMethod, payload: payloadLog });

      if (response.ok && data.success) {
        if (editingProduct) {
          setUploadSuccess(`Masterpiece "${formName}" updated successfully in Firestore!`);
          if (onProductUpdated) {
            onProductUpdated(data.product);
          }
        } else {
          setUploadSuccess(`Masterpiece "${formName}" added successfully to Firestore Database!`);
          if (onProductAdded) {
            onProductAdded(data.product);
          }
        }

        // Clean up and reset form fields
        handleCancelEdit();
      } else {
        throw new Error(data.error || "Failed to commit product changes to backend.");
      }
    } catch (err: any) {
      console.error("[Aurelius Client Trace] Failed to upload/edit product. Stack trace:", err.stack || err);
      setUploadError(err.message || "An unexpected error occurred during database writing.");
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to safely parse and log server response
  const safeParseJSON = async (response: Response, requestDetails?: { url: string; method: string; payload?: any }) => {
    const url = requestDetails?.url || response.url;
    const method = requestDetails?.method || "UNKNOWN";
    const status = response.status;
    const contentType = response.headers.get("content-type") || "";

    console.log(`[Aurelius Client Trace] >>> REQUEST OUTGOING: ${method} ${url}`);
    if (requestDetails?.payload) {
      console.log(`[Aurelius Client Trace] REQUEST PAYLOAD:`, JSON.stringify(requestDetails.payload, null, 2));
    }

    console.log(`[Aurelius Client Trace] <<< RESPONSE INCOMING: ${method} ${url} | Status: ${status} | Content-Type: ${contentType}`);
    
    // Log response headers
    const headersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    console.log(`[Aurelius Client Trace] RESPONSE HEADERS:`, JSON.stringify(headersObj, null, 2));

    if (status === 204) {
      console.warn(`[Aurelius Client Trace] Warning: Received 204 No Content. Returning empty success object.`);
      AureliusLogger.logRequestSuccess({
        url,
        method,
        status,
        payload: requestDetails?.payload,
        headers: headersObj,
        responseBody: { success: true, message: "Transaction succeeded with no content." }
      });
      return { success: true, message: "Transaction succeeded with no content." };
    }

    let rawText = "";
    try {
      rawText = await response.text();
      console.log(`[Aurelius Client Trace] RESPONSE BODY (Raw, up to 2000 chars):`, rawText.substring(0, 2000));
    } catch (textErr: any) {
      console.error(`[Aurelius Client Trace] Failed to read response text:`, textErr);
      const errMsg = `Failed to read response body text: ${textErr.message}`;
      AureliusLogger.logRequestError({
        url,
        method,
        status,
        payload: requestDetails?.payload,
        headers: headersObj,
        error: errMsg,
        stack: textErr.stack
      });
      throw textErr;
    }

    if (!rawText || rawText.trim() === "") {
      const errMsg = `Server returned an empty response (Status: ${status}).`;
      AureliusLogger.logRequestError({
        url,
        method,
        status,
        payload: requestDetails?.payload,
        headers: headersObj,
        error: errMsg,
        responseBody: ""
      });
      throw new Error(errMsg);
    }

    if (!contentType.includes("application/json")) {
      const errMsg = `Server returned non-JSON content: "${contentType}" (Status: ${status}).`;
      AureliusLogger.logRequestError({
        url,
        method,
        status,
        payload: requestDetails?.payload,
        headers: headersObj,
        error: errMsg,
        responseBody: rawText
      });
      throw new Error(`${errMsg} Body preview: ${rawText.substring(0, 250)}`);
    }

    try {
      const parsed = JSON.parse(rawText);
      if (status >= 400 || (parsed && parsed.success === false)) {
        AureliusLogger.logRequestError({
          url,
          method,
          status,
          payload: requestDetails?.payload,
          headers: headersObj,
          error: parsed.error || `Server responded with status ${status}`,
          responseBody: parsed
        });
      } else {
        AureliusLogger.logRequestSuccess({
          url,
          method,
          status,
          payload: requestDetails?.payload,
          headers: headersObj,
          responseBody: parsed
        });
      }
      return parsed;
    } catch (err: any) {
      console.error(`[Aurelius Client Trace] JSON Parsing Failed. Stack trace:`, err.stack || err);
      const errMsg = `Failed to parse response as JSON: ${err.message}`;
      AureliusLogger.logRequestError({
        url,
        method,
        status,
        payload: requestDetails?.payload,
        headers: headersObj,
        error: errMsg,
        stack: err.stack,
        responseBody: rawText
      });
      throw new Error(`${errMsg}. Raw body preview: ${rawText.substring(0, 250)}`);
    }
  };

  // Handle deleting a dynamic product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Are you certain you wish to decommission "${name}"? This action permanently purges it from Firestore.`)) {
      return;
    }

    try {
      const reqUrl = `/api/products/${id}`;
      const response = await fetch(reqUrl, {
        method: "DELETE"
      });

      const data = await safeParseJSON(response, { url: reqUrl, method: "DELETE" });
      if (response.ok && data.success) {
        alert("Masterpiece purged successfully from the digital vault.");
        if (onProductDeleted) {
          onProductDeleted(id);
        }
      } else {
        throw new Error(data.error || "Failed to delete product.");
      }
    } catch (err: any) {
      console.error("[Aurelius Client Trace] Deletion error. Stack trace:", err.stack || err);
      alert(`Purging error: ${err.message || "Failed to complete transaction."}`);
    }
  };

  // Filter custom added products (the ones with IDs starting with firestore autoIDs or image having /uploads/)
  const customProducts = products.filter(
    (p) => p.image && p.image.startsWith("/uploads/")
  );

  // Lock screen UI
  if (!isAuthenticated) {
    return (
      <div id="admin-security-lock" className="min-h-[80vh] flex items-center justify-center bg-[#111111] px-4 font-sans">
        <div className="max-w-md w-full bg-[#1A1A1A] rounded border border-[#C5A05A]/40 p-8 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#C5A05A]/10 border border-[#C5A05A]/30 flex items-center justify-center text-[#C5A05A]">
            <Lock className="h-7 w-7 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="font-mono text-[9px] tracking-[0.35em] text-[#C5A05A] uppercase block">Aurelius Heritage Atelier</span>
            <h1 className="font-serif text-2xl font-medium text-white tracking-tight">OPERATIONAL SECURITY GATEWAY</h1>
            <p className="text-xs text-gray-400 font-light leading-relaxed">
              This is a private, password-protected admin terminal. Please supply the corporate key to unlock the inventory ledger, marketing studio, and deployment hub.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                required
                placeholder="Enter Access Password..."
                className="w-full bg-[#111111] border border-gray-800 rounded px-4 py-3 outline-none text-white focus:border-[#C5A05A] text-center text-sm font-mono tracking-widest"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="absolute right-3.5 top-3 text-gray-600 text-[10px] font-mono select-none">
                Hint: aurelius2026
              </span>
            </div>

            {authError && (
              <p className="text-[11px] text-red-400 font-medium font-mono bg-red-950/20 border border-red-900/30 p-2 rounded">
                ⚠️ {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-[#C5A05A] hover:bg-[#A5673F] text-black hover:text-white py-3 uppercase tracking-widest font-semibold rounded text-[10.5px] transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-md"
            >
              <Unlock className="h-3.5 w-3.5" />
              <span>Unlock Operational Portal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPassword("aurelius2026");
                setIsAuthenticated(true);
              }}
              className="w-full bg-[#222222] hover:bg-[#2F241F] text-[#C5A05A] border border-[#C5A05A]/35 py-3 uppercase tracking-widest font-semibold rounded text-[10.5px] transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md mt-2"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#C5A05A] animate-pulse" />
              <span>Instant Demo Bypass Access</span>
            </button>
          </form>

          <p className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">
            ESTABLISHED Florence, Italy • SECURED SSL 256
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="admin-panel-portal" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-sans text-xs sm:text-sm">
      
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6 mb-8">
        <div>
          <span className="font-mono text-[9px] tracking-[0.3em] text-[#C5A05A] uppercase block mb-1">Administrative Master Suite</span>
          <h1 className="font-serif text-2xl sm:text-3.5xl font-medium tracking-tight text-white uppercase">Atelier Controller Portal</h1>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-[#111111]/90 border border-gray-800 rounded p-1">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3 py-1.5 rounded uppercase font-mono text-[10px] tracking-wider transition-colors ${
              activeTab === "analytics" ? "bg-[#C5A05A] text-black font-bold" : "text-gray-400 hover:text-white"
            }`}
          >
            Analytics Dashboard
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-3 py-1.5 rounded uppercase font-mono text-[10px] tracking-wider transition-colors ${
              activeTab === "inventory" ? "bg-[#C5A05A] text-black font-bold" : "text-gray-400 hover:text-white"
            }`}
          >
            Manage Inventory
          </button>
          <button
            onClick={() => setActiveTab("deployment")}
            className={`px-3 py-1.5 rounded uppercase font-mono text-[10px] tracking-wider transition-colors ${
              activeTab === "deployment" ? "bg-[#C5A05A] text-black font-bold" : "text-gray-400 hover:text-white"
            }`}
          >
            cPanel Deployment Hub
          </button>
        </div>
      </div>

      {/* RENDER ANALYTICS TAB */}
      {activeTab === "analytics" && (
        <>
          {/* Grid: High-level KPI widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            
            {/* Revenue */}
            <div className="bg-[#111111] text-white border border-[#C5A05A]/25 p-5 rounded flex justify-between items-center relative overflow-hidden">
              <div>
                <span className="text-[10px] tracking-widest text-[#C5A05A] uppercase block mb-1">Weekly Gross Revenue</span>
                <span className="font-mono text-xl sm:text-2xl font-bold">$71,800.00</span>
                <p className="text-[10.5px] text-green-400 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +14.8% from last week
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-white/10" />
            </div>

            {/* Orders */}
            <div className="bg-[#1A1A1A] border border-gray-800 p-5 rounded flex justify-between items-center shadow-md text-white">
              <div>
                <span className="text-[10px] tracking-widest text-gray-400 uppercase block mb-1">Unboxed Orders</span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#FCFCFA]">158 Units</span>
                <p className="text-[10.5px] text-gray-400 mt-1">Pending allocation: 4 bags</p>
              </div>
              <ShoppingCart className="h-10 w-10 text-neutral-700" />
            </div>

            {/* Active VIP client count */}
            <div className="bg-[#1A1A1A] border border-gray-800 p-5 rounded flex justify-between items-center shadow-md text-white">
              <div>
                <span className="text-[10px] tracking-widest text-gray-400 uppercase block mb-1">Registered VIP Clients</span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#FCFCFA]">1,420 Executive</span>
                <p className="text-[10.5px] text-[#C5A05A] mt-1">94 Platinum status tier</p>
              </div>
              <Users className="h-10 w-10 text-neutral-700" />
            </div>

            {/* Active conversion checks */}
            <div className="bg-red-950/20 border border-red-900/40 p-5 rounded flex justify-between items-center">
              <div>
                <span className="text-[10px] tracking-widest text-red-400 uppercase block mb-1">Critical Stock Warnings</span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-red-200">{lowStockItems.length} SKUs</span>
                <p className="text-[10.5px] text-red-300 mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Requires rapid tannery restocking
                </p>
              </div>
              <Flame className="h-10 w-10 text-red-900/40" />
            </div>
          </div>

          {/* Brand Health & Dynamic Operations Console */}
          <div className="bg-[#151515] border border-gray-850 rounded-lg p-6 mb-10 space-y-8">
            <div>
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-[#C5A05A] animate-pulse" />
                <span className="font-mono text-[9px] tracking-[0.3em] text-[#C5A05A] uppercase block">Operations Center</span>
              </div>
              <h2 className="font-serif text-lg font-medium text-white uppercase mt-1">Brand Health & Executive Metrics</h2>
              <p className="text-xs text-gray-400 mt-1 font-light">
                Monitor asset capital allocation, consumer category interest, and active workshop bottlenecks.
              </p>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Metric 1: Total Stock Value */}
              <div className="bg-[#1A1A1A] border border-gray-800 p-5 rounded relative overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="text-[10px] tracking-widest text-gray-400 uppercase block mb-1">Total Stock Value</span>
                  <span className="font-mono text-2xl font-bold text-white block mt-1">
                    ${products.reduce((acc, p) => acc + (p.price * (p.inStock !== undefined ? p.inStock : 10)), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-mono">Based on {products.length} registered SKUs</span>
                  <span className="text-[9px] bg-[#C5A05A]/10 text-[#C5A05A] border border-[#C5A05A]/35 px-1.5 py-0.5 rounded uppercase font-mono font-bold">
                    Active Capital
                  </span>
                </div>
              </div>

              {/* Metric 2: Most Popular Category */}
              <div className="bg-[#1A1A1A] border border-gray-800 p-5 rounded relative overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="text-[10px] tracking-widest text-gray-400 uppercase block mb-1">Most Popular Category</span>
                  <span className="font-serif text-lg font-semibold text-[#C5A05A] block mt-1">
                    {COLLECTION_SALES.reduce((prev, current) => (prev.sales > current.sales) ? prev : current).name}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-mono">
                    Top share: {COLLECTION_SALES.reduce((prev, current) => (prev.sales > current.sales) ? prev : current).sales} premium sales
                  </span>
                  <span className="text-[9px] bg-[#C5A05A]/10 text-[#C5A05A] border border-[#C5A05A]/35 px-1.5 py-0.5 rounded uppercase font-mono font-bold">
                    Highest Volume
                  </span>
                </div>
              </div>

              {/* Metric 3: Pending Order Count */}
              <div className="bg-[#1A1A1A] border border-gray-800 p-5 rounded relative overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="text-[10px] tracking-widest text-gray-400 uppercase block mb-1">Pending Order Count</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="font-mono text-2xl font-bold text-white">
                      {["AUR-3022", "AUR-9204", "AUR-8113"].filter(id => (activeOrderStages[id] !== undefined ? activeOrderStages[id] : 1) < 4).length}
                    </span>
                    {["AUR-3022", "AUR-9204", "AUR-8113"].filter(id => (activeOrderStages[id] !== undefined ? activeOrderStages[id] : 1) < 4).length > 0 && (
                      <span className="h-2.5 w-2.5 bg-amber-500 rounded-full animate-pulse animate-duration-1000" />
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-mono">Active commissions in workshop</span>
                  <span className="text-[9px] bg-[#C5A05A]/10 text-[#C5A05A] border border-[#C5A05A]/35 px-1.5 py-0.5 rounded uppercase font-mono font-bold">
                    In Production
                  </span>
                </div>
              </div>

            </div>

            {/* Simple Bar & Pie Charts Grid for Brand Health */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Asset Capital allocation by Category (Bar Chart) (Span 6) */}
              <div className="lg:col-span-6 bg-[#111111] border border-gray-800 rounded p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-serif text-xs font-semibold text-white uppercase tracking-wider">Asset Capital Allocation (Stock Value)</h3>
                  <span className="text-[9px] font-mono text-gray-500 uppercase">Live catalog data</span>
                </div>
                
                <div className="h-48 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={[
                        { 
                          name: "Bags", 
                          value: products.filter(p => p.category === "bags").reduce((sum, p) => sum + (p.price * (p.inStock !== undefined ? p.inStock : 10)), 0),
                          fill: "#7A4E2D" 
                        },
                        { 
                          name: "Shoes", 
                          value: products.filter(p => p.category === "shoes").reduce((sum, p) => sum + (p.price * (p.inStock !== undefined ? p.inStock : 10)), 0),
                          fill: "#B98B5D" 
                        },
                        { 
                          name: "Accessories", 
                          value: products.filter(p => p.category === "accessories").reduce((sum, p) => sum + (p.price * (p.inStock !== undefined ? p.inStock : 10)), 0),
                          fill: "#C5A05A" 
                        },
                      ]} 
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="name" stroke="#555" fontSize={10} />
                      <YAxis stroke="#555" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#111", borderColor: "#C5A05A", color: "#fff" }} 
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, "Stock Capital Value"]} 
                      />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                        {[
                          { name: "Bags", fill: "#7A4E2D" },
                          { name: "Shoes", fill: "#B98B5D" },
                          { name: "Accessories", fill: "#C5A05A" }
                        ].map((entry, idx) => (
                          <Cell key={`cell-dyn-${idx}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Column: Category Demand Share (Pie Chart) (Span 6) */}
              <div className="lg:col-span-6 bg-[#111111] border border-gray-800 rounded p-5 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-serif text-xs font-semibold text-white uppercase tracking-wider">Category Sales Demand Share</h3>
                  <span className="text-[9px] font-mono text-gray-500 uppercase">Volume distribution</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
                  <div className="h-40 w-40 text-xs relative flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={COLLECTION_SALES.map(item => ({
                            name: item.name,
                            value: item.sales,
                            fill: item.fill
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {COLLECTION_SALES.map((entry, index) => (
                            <Cell key={`cell-pie-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#111", borderColor: "#C5A05A", color: "#fff" }} 
                          formatter={(value) => [`${value} items sold`, "Popularity Share"]} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">Total Sales</span>
                      <span className="font-mono text-base font-bold text-white">
                        {COLLECTION_SALES.reduce((sum, item) => sum + item.sales, 0)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-[10px] font-mono text-gray-400 w-full sm:w-auto">
                    {COLLECTION_SALES.map((item, idx) => {
                      const totalSales = COLLECTION_SALES.reduce((sum, i) => sum + i.sales, 0);
                      const percentage = Math.round((item.sales / totalSales) * 100);
                      return (
                        <div key={idx} className="flex items-center justify-between sm:justify-start sm:space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                            <span className="text-white font-medium">{item.name}</span>
                          </div>
                          <span>{percentage}% ({item.sales} sold)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Interactive Operations Pipeline Steward */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded p-5">
              <div className="flex items-center justify-between mb-4 border-b border-gray-850 pb-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-[#C5A05A]" />
                  <h3 className="font-serif text-sm font-semibold text-white">Workshop Tracking Pipeline Control</h3>
                </div>
                <span className="text-[10px] font-mono text-[#C5A05A] uppercase tracking-wider">Live Simulator</span>
              </div>

              <p className="text-xs text-gray-400 mb-5 leading-relaxed font-light font-sans">
                As an administrator, you have permission to advance active custom commissions through the five stages of production and delivery. Changing these values instantly updates the client's private dashboard.
              </p>

              <div className="space-y-4">
                {[
                  { id: "AUR-3022", name: "Aurelius Travel Bag Commission", defaultVal: "Vintage Brown" },
                  { id: "AUR-9204", name: "Aurelius Navigator Duffel", defaultVal: "Saddle Brown" },
                  { id: "AUR-8113", name: "Aurelius Leather Nomad Sneakers", defaultVal: "Warm White" }
                ].map((order, idx) => {
                  const currentStage = activeOrderStages[order.id] !== undefined ? activeOrderStages[order.id] : 1;
                  const stagesList = [
                    "Tannery Processing",
                    "Artisan Stitching",
                    "Quality Inspection",
                    "Out for Delivery",
                    "Sovereign Handover (Completed)"
                  ];

                  return (
                    <div key={idx} className="bg-[#111] border border-gray-850 rounded p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-sans">
                      <div>
                        <div className="flex items-center space-x-2 font-mono">
                          <span className="text-xs font-bold text-[#C5A05A]">{order.id}</span>
                          <span className="text-[9px] text-gray-500">• {order.defaultVal}</span>
                        </div>
                        <p className="text-xs font-serif font-medium text-white mt-1">{order.name}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <span className="text-[10px] font-mono text-gray-400">Current Pipeline Phase:</span>
                        <select
                          value={currentStage}
                          onChange={(e) => handleUpdateOrderStage(order.id, parseInt(e.target.value))}
                          className="bg-[#222] text-xs text-white border border-gray-800 rounded px-3 py-1.5 focus:outline-none cursor-pointer focus:border-[#C5A05A] font-semibold"
                        >
                          {stagesList.map((stg, i) => (
                            <option key={i} value={i} className="bg-[#111] text-white">
                              Phase {i + 1}: {stg}
                            </option>
                          ))}
                        </select>
                        <span className={`h-2 w-2 rounded-full ${currentStage === 4 ? "bg-green-500" : "bg-amber-500 animate-pulse"}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Grid: Charts (using recharts) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
            
            {/* Weekly sales Line chart (Span 8) */}
            <div className="lg:col-span-8 bg-[#1A1A1A] border border-gray-800 rounded p-5 sm:p-6 shadow-md text-white">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-serif text-base font-semibold text-white">Weekly Revenue Trajectory ($)</h3>
                <span className="text-[10px] bg-[#111111]/80 border border-gray-800 rounded px-2.5 py-0.5 text-gray-400 font-mono">
                  Live Feed
                </span>
              </div>

              <div className="h-64 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" opacity={0.6} />
                    <XAxis dataKey="day" stroke="#777" />
                    <YAxis stroke="#777" />
                    <Tooltip contentStyle={{ backgroundColor: "#111", borderColor: "#C5A05A", color: "#fff" }} formatter={(value) => [`$${value}`, "Revenue"]} />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#C5A05A" 
                      strokeWidth={3} 
                      activeDot={{ r: 6 }} 
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sales by collection Bar Chart (Span 4) */}
            <div className="lg:col-span-4 bg-[#1A1A1A] border border-gray-800 rounded p-5 sm:p-6 shadow-md text-white">
              <h3 className="font-serif text-base font-semibold text-white mb-6">Collection Performance (SKUs sold)</h3>
              
              <div className="h-64 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={COLLECTION_SALES} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#777" />
                    <YAxis stroke="#777" />
                    <Tooltip contentStyle={{ backgroundColor: "#111", borderColor: "#C5A05A", color: "#fff" }} formatter={(value) => [value, "Items Sold"]} />
                    <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                      {COLLECTION_SALES.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Grid: Low Stock Alert & AI product Copywriting Studio */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Low stock alerts & supplier list (Span 5) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Stock warnings */}
              <div className="bg-[#1A1A1A] border border-gray-800 rounded p-5 shadow-md">
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-[#C5A05A]" />
                  <h3 className="font-serif text-base font-semibold text-white">Critical Hide Stock Logs</h3>
                </div>
                
                <div className="space-y-3 font-sans">
                  {lowStockItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-red-950/20 rounded border border-red-900/30">
                      <div>
                        <p className="font-semibold text-white text-xs">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">ID: {item.id}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-red-950/50 text-red-300 border border-red-900/40 text-[10px] px-2 py-0.5 rounded font-bold font-mono">
                          {item.qty} left
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supplier sync logs */}
              <div className="bg-[#1A1A1A] border border-gray-800 rounded p-5 shadow-md">
                <h3 className="font-serif text-base font-semibold text-white mb-3.5">Atelier Supplier Synchronization</h3>
                <div className="space-y-2.5 text-xs text-gray-300">
                  <div className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-gray-400">Tuscany Vegetable Tannery</span>
                    <span className="text-green-400 font-bold">● Synchronized</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-gray-400">Northampton Cobbler Atelier</span>
                    <span className="text-green-400 font-bold">● Synchronized</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-400">Milan Luxury Leather Accessories</span>
                    <span className="text-[#C5A05A] font-bold animate-pulse">↻ Syncing Drafts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: AI product description studio (Span 7) */}
            <div className="lg:col-span-7 bg-[#222222]/30 border border-[#C5A05A]/30 rounded p-6 shadow-md text-white font-sans">
              
              <div className="flex items-center space-x-2.5 mb-4">
                <Sparkles className="h-5 w-5 text-[#C5A05A]" />
                <h3 className="font-serif text-base font-semibold text-white">AI Copywriting Studio</h3>
              </div>
              
              <p className="text-gray-400 text-xs mb-6 leading-relaxed font-light font-sans">
                Drafting a new product introduction? Provide minimal details to consult our AI copywriter. It outputs luxury, magazine-level marketing copy instantly.
              </p>

              <form onSubmit={handleGenerateDescription} className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 mb-1">Leather Item Name</label>
                    <input
                      type="text"
                      className="w-full bg-[#111111] border border-gray-800 rounded px-3 py-2 outline-none text-white focus:border-[#C5A05A]"
                      placeholder="e.g. Aurelius Sovereign Duffel"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Catalog Category</label>
                    <select
                      className="w-full bg-[#111111] border border-gray-800 rounded px-3 py-2 outline-none text-white focus:border-[#C5A05A]"
                      value={prodCat}
                      onChange={(e) => setProdCat(e.target.value)}
                    >
                      <option value="Travel Bags">Travel Bags</option>
                      <option value="Handmade Shoes">Handmade Shoes</option>
                      <option value="Premium Accessories">Premium Accessories</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 mb-1">Key Hide Features</label>
                    <input
                      type="text"
                      className="w-full bg-[#111111] border border-gray-800 rounded px-3 py-2 outline-none text-white focus:border-[#C5A05A]"
                      placeholder="e.g. 2mm Crazy Horse hide, pure brass details"
                      value={prodFeatures}
                      onChange={(e) => setProdFeatures(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Copywriting Voice Tone</label>
                    <select
                      className="w-full bg-[#111111] border border-gray-800 rounded px-3 py-2 outline-none text-white focus:border-[#C5A05A]"
                      value={prodTone}
                      onChange={(e) => setProdTone(e.target.value)}
                    >
                      <option value="luxurious">Luxurious & Editorial</option>
                      <option value="heritage">Heritage & Classic</option>
                      <option value="rugged">Rugged Executive</option>
                      <option value="minimalist">Apple-Level Simplicity</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isGenerating || !prodName.trim()}
                  className="w-full bg-[#C5A05A] hover:bg-[#A5673F] text-black hover:text-white disabled:bg-neutral-800 disabled:text-gray-500 py-3 uppercase tracking-widest font-semibold rounded text-[10px] transition-colors flex items-center justify-center space-x-2 shadow-md cursor-pointer border border-transparent font-sans"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{isGenerating ? "Drafting Editorial Legacy..." : "Inscribe Luxury Description"}</span>
                </button>
              </form>

              {/* Result Output Card */}
              {generatedDescription && (
                <div className="mt-6 bg-[#111111] border border-[#C5A05A]/40 rounded p-4 relative">
                  <button
                    onClick={handleCopyAI}
                    className="absolute top-4 right-4 p-1.5 rounded bg-[#222222] hover:bg-[#333333] border border-gray-800 text-gray-300 transition-all flex items-center space-x-1"
                    title="Copy to clipboard"
                  >
                    {copiedAI ? (
                      <>
                        <ClipboardCheck className="h-3.5 w-3.5 text-green-400" />
                        <span className="text-[9px] text-green-400 font-bold font-mono">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span className="text-[9px] font-mono">Copy Draft</span>
                      </>
                    )}
                  </button>

                  <span className="text-[9px] text-[#C5A05A] font-mono tracking-widest uppercase block mb-3 font-semibold">Generated Copywriting</span>
                  
                  <div className="text-xs text-gray-300 leading-relaxed max-h-56 overflow-y-auto pr-2 whitespace-pre-wrap font-sans">
                    {generatedDescription}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* RENDER INVENTORY TAB */}
      {activeTab === "inventory" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Add / Edit Product Form (Span 5) */}
          <div id="admin-form-anchor" className="lg:col-span-5 bg-[#1A1A1A] border border-gray-800 rounded p-6 shadow-md text-white font-sans scroll-mt-6">
            <div className="flex items-center justify-between mb-5 border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-2.5">
                {editingProduct ? (
                  <FileEdit className="h-5 w-5 text-[#C5A05A]" />
                ) : (
                  <Plus className="h-5 w-5 text-[#C5A05A]" />
                )}
                <h2 className="font-serif text-lg font-medium tracking-tight text-white uppercase">
                  {editingProduct ? "Edit Masterpiece" : "Insert Custom Masterpiece"}
                </h2>
              </div>
              {editingProduct && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-2.5 py-1 rounded bg-[#222222] hover:bg-[#333333] text-[9.5px] tracking-wider uppercase font-mono text-gray-400 hover:text-white transition-all border border-gray-850"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4 text-xs font-sans">
              
              <div>
                <label className="block text-gray-400 mb-1 uppercase tracking-wider text-[9px] font-mono">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aurelius Valerius Travel Duffel"
                  className="w-full bg-[#111111] border border-gray-800 rounded px-3 py-2 outline-none text-white focus:border-[#C5A05A]"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1 uppercase tracking-wider text-[9px] font-mono">Price (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 295.00"
                    className="w-full bg-[#111111] border border-gray-800 rounded px-3 py-2 outline-none text-white focus:border-[#C5A05A] font-mono"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 uppercase tracking-wider text-[9px] font-mono">Original Price (Strikeout)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 395.00 (Blank if none)"
                    className="w-full bg-[#111111] border border-gray-800 rounded px-3 py-2 outline-none text-white focus:border-[#C5A05A] font-mono"
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1 uppercase tracking-wider text-[9px] font-mono">Initial Stock *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 10"
                    className="w-full bg-[#111111] border border-gray-800 rounded px-3 py-2 outline-none text-white focus:border-[#C5A05A] font-mono"
                    value={formInStock}
                    onChange={(e) => setFormInStock(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 uppercase tracking-wider text-[9px] font-mono">Subcategory Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Heritage Briefcase"
                    className="w-full bg-[#111111] border border-gray-800 rounded px-3 py-2 outline-none text-white focus:border-[#C5A05A]"
                    value={formSubcategory}
                    onChange={(e) => setFormSubcategory(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1 uppercase tracking-wider text-[9px] font-mono">Category Folder *</label>
                  <select
                    className="w-full bg-[#111111] border border-gray-800 rounded px-3 py-2 outline-none text-white focus:border-[#C5A05A]"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                  >
                    <option value="bags">Travel Bags Collection</option>
                    <option value="shoes">Handmade Shoes Collection</option>
                    <option value="accessories">Premium Accessories Collection</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 uppercase tracking-wider text-[9px] font-mono">Product Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Inscribe product materials, leather tanning method, and care details..."
                  className="w-full bg-[#111111] border border-gray-800 rounded px-3 py-2 outline-none text-white focus:border-[#C5A05A]"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              {/* TECHNICAL SPECS */}
              <div className="bg-[#111111] p-3 rounded border border-gray-800 space-y-3">
                <span className="font-mono text-[9px] tracking-widest uppercase text-[#C5A05A] block">Technical Ledger Details</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Dimensions (e.g. 45 x 22 x 25 cm)"
                    className="bg-[#1A1A1A] border border-gray-800 rounded p-1.5 outline-none text-white focus:border-[#C5A05A] text-[11px]"
                    value={formDimensions}
                    onChange={(e) => setFormDimensions(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Weight (e.g. 1.5 kg)"
                    className="bg-[#1A1A1A] border border-gray-800 rounded p-1.5 outline-none text-white focus:border-[#C5A05A] text-[11px]"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Capacity (e.g. 30 Litres)"
                    className="bg-[#1A1A1A] border border-gray-800 rounded p-1.5 outline-none text-white focus:border-[#C5A05A] text-[11px]"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Key features (comma separated)"
                    className="bg-[#1A1A1A] border border-gray-800 rounded p-1.5 outline-none text-white focus:border-[#C5A05A] text-[11px]"
                    value={formFeatures}
                    onChange={(e) => setFormFeatures(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Colors (e.g. Classic Amber, Black)"
                    className="bg-[#1A1A1A] border border-gray-800 rounded p-1.5 outline-none text-white focus:border-[#C5A05A] text-[11px]"
                    value={formVariantColors}
                    onChange={(e) => setFormVariantColors(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Colors HEX (e.g. #C5A05A, #111111)"
                    className="bg-[#1A1A1A] border border-gray-800 rounded p-1.5 outline-none text-white focus:border-[#C5A05A] text-[11px]"
                    value={formVariantColorsHex}
                    onChange={(e) => setFormVariantColorsHex(e.target.value)}
                  />
                </div>
              </div>

              {/* DYNAMIC MULTI-IMAGE UPLOAD (MAX 10) */}
              <div className="bg-[#111111] p-3 rounded border border-gray-800 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[#C5A05A] font-mono text-[9px] tracking-widest uppercase">Masterpiece Photographs (Up to 10) *</label>
                  <span className="text-[9px] font-mono text-gray-500">
                    {existingImages.length + imageFiles.length}/10 selected
                  </span>
                </div>

                {/* Previews of Existing Images when Editing */}
                {existingImages.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] text-gray-500 uppercase font-mono">Preserved Catalog Assets:</p>
                    <div className="grid grid-cols-5 gap-2">
                      {existingImages.map((src, index) => (
                        <div key={index} className="relative group aspect-square rounded overflow-hidden border border-gray-800 bg-[#1A1A1A]">
                          <img src={src} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(src)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previews of Newly Selected Images */}
                {imagePreviews.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] text-green-400 uppercase font-mono">Staged to upload:</p>
                    <div className="grid grid-cols-5 gap-2">
                      {imagePreviews.map((src, index) => (
                        <div key={index} className="relative group aspect-square rounded overflow-hidden border border-gray-800 bg-[#1A1A1A]">
                          <img src={src} className="w-full h-full object-cover" alt="" />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewImage(index)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* File Drop/Input Trigger */}
                {(existingImages.length + imageFiles.length < 10) && (
                  <div className="border border-dashed border-gray-800 hover:border-[#C5A05A]/50 rounded bg-[#1A1A1A] p-3 text-center cursor-pointer transition-all relative">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleMultiImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="py-1">
                      <Upload className="mx-auto h-5 w-5 text-gray-500" />
                      <p className="text-[10px] text-gray-400 mt-1 font-medium">Click to select product photos</p>
                      <p className="text-[8px] text-gray-600 font-mono">JPEG, PNG, WEBP • Max 10 images concurrently</p>
                    </div>
                  </div>
                )}
              </div>

              {/* MASTERPIECE VIDEO PREVIEW */}
              <div className="bg-[#111111] p-3 rounded border border-gray-800 space-y-3">
                <label className="block text-[#C5A05A] font-mono text-[9px] tracking-widest uppercase">Artisan Studio Video Preview</label>
                
                {/* Existing Video asset representation */}
                {!videoPreview && existingVideo && (
                  <div className="flex items-center justify-between p-2 rounded bg-neutral-900 border border-gray-850">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-[#C5A05A] animate-pulse" />
                      <span className="text-[10px] text-gray-300 font-mono">Preserved: Video loop active</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExistingVideo("")}
                      className="text-red-400 hover:text-red-300 uppercase tracking-wider text-[9px] font-mono font-bold"
                    >
                      Delete
                    </button>
                  </div>
                )}

                {/* Newly selected video preview */}
                {videoPreview && (
                  <div className="space-y-2">
                    <video src={videoPreview} controls className="w-full h-24 rounded border border-gray-850 bg-black" />
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] text-green-400 font-mono truncate max-w-[70%]">{videoFile?.name}</p>
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className="text-red-400 hover:text-red-300 font-mono text-[9px] uppercase font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Video Selection Input */}
                {!videoPreview && !existingVideo && (
                  <div className="border border-dashed border-gray-800 hover:border-[#C5A05A]/50 rounded bg-[#1A1A1A] p-3 text-center cursor-pointer transition-all relative">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="py-1">
                      <Upload className="mx-auto h-5 w-5 text-gray-500" />
                      <p className="text-[10px] text-gray-400 mt-1 font-medium">Click to select showcase video</p>
                      <p className="text-[8px] text-gray-600 font-mono">MP4, MOV, WEBM (Max 50MB limits)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status feedback */}
              {uploadError && (
                <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-300 rounded font-mono text-[10px]">
                  ⚠️ Error: {uploadError}
                </div>
              )}
              {uploadSuccess && (
                <div className="p-3 bg-green-950/20 border border-green-900/30 text-green-300 rounded font-mono text-[10px] flex items-start space-x-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading}
                className="w-full bg-[#C5A05A] hover:bg-[#A5673F] text-black hover:text-white disabled:bg-neutral-800 disabled:text-gray-500 py-3 uppercase tracking-widest font-semibold rounded text-[10px] transition-colors flex items-center justify-center space-x-2 shadow-md cursor-pointer border border-transparent font-sans"
              >
                {editingProduct ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-black" />
                    <span>{isUploading ? "Updating catalog entries..." : "Apply Masterpiece Changes"}</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>{isUploading ? "Uploading & Writing to Firestore..." : "Log Product to Database"}</span>
                  </>
                )}
              </button>

            </form>
          </div>

          {/* Manage Products List (Span 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-[#1A1A1A] border border-gray-800 rounded p-6 shadow-md text-white font-sans">
              <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-[#C5A05A]" />
                  <h2 className="font-serif text-lg font-medium tracking-tight text-white uppercase">Vault-Stored Products</h2>
                </div>
                <span className="font-mono text-[10px] bg-[#111111]/80 border border-gray-800 rounded px-2.5 py-0.5 text-[#C5A05A]">
                  {customProducts.length} custom SKUs
                </span>
              </div>

              {customProducts.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-800 rounded bg-[#111111]/50 font-sans">
                  <Database className="mx-auto h-8 w-8 text-neutral-600 mb-3" />
                  <p className="font-serif text-sm font-semibold text-gray-400">No dynamic database items logged yet</p>
                  <p className="text-[10px] text-gray-500 max-w-xs mx-auto mt-1 leading-relaxed">
                    Insert products via the form on the left. They will be saved securely to Firestore and live-inserted into the catalog!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-[10px] uppercase text-gray-400 font-mono">
                        <th className="pb-3">Masterpiece</th>
                        <th className="pb-3">Category</th>
                        <th className="pb-3">Price</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-sans">
                      {customProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-900/40">
                          <td className="py-3.5 pr-2">
                            <div className="flex items-center space-x-3">
                              <img src={p.image} className="w-9 h-9 object-cover rounded border border-gray-800 shadow" alt={p.name} referrerPolicy="no-referrer" />
                              <div className="max-w-44 sm:max-w-xs truncate">
                                <span className="font-semibold text-white text-[12px] block truncate">{p.name}</span>
                                <span className="text-[10px] text-gray-500 font-mono truncate block">ID: {p.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 capitalize text-gray-300 font-mono text-[10.5px]">
                            {p.category}
                          </td>
                          <td className="py-3.5 text-white font-mono font-semibold">
                            ${p.price.toFixed(2)}
                          </td>
                          <td className="py-3.5 text-right space-x-1">
                            <button
                              onClick={() => handleEditProduct(p)}
                              className="p-1.5 text-[#C5A05A] hover:text-white hover:bg-[#C5A05A]/10 rounded border border-transparent hover:border-[#C5A05A]/35 transition-all cursor-pointer inline-flex items-center"
                              title="Edit product"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1.5 text-red-400 hover:text-white hover:bg-red-950/60 rounded border border-transparent hover:border-red-900/30 transition-all cursor-pointer inline-flex items-center"
                              title="Delete product from database"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* General Database Sync info box */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded p-5 flex items-start space-x-4">
              <div className="p-2.5 rounded bg-[#C5A05A]/10 text-[#C5A05A] border border-[#C5A05A]/20 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-1 font-sans">
                <h4 className="font-semibold text-white text-xs">Live Synchronization Engine Active</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed font-light">
                  Aurelius database controllers are listening live on Firestore. Adding products through this secure terminal automatically updates the catalog, lookbooks, search queries, and inventory grids for all active visitors worldwide in under 200 milliseconds.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* RENDER CPANEL DEPLOYMENT HUB */}
      {activeTab === "deployment" && (
        <div className="space-y-8 font-sans">
          
          <div className="bg-[#1A1A1A] border border-[#C5A05A]/35 rounded p-6 shadow-md text-white">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded bg-[#C5A05A]/10 text-[#C5A05A] border border-[#C5A05A]/25 shrink-0">
                <Database className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <span className="font-mono text-[9px] tracking-[0.25em] text-[#C5A05A] uppercase block">cPanel Server Deployment</span>
                <h2 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-white uppercase">Namecheap Hosting Migration Hub</h2>
                <p className="text-xs text-gray-400 leading-relaxed font-light max-w-4xl">
                  Are you hosting your website on Namecheap cPanel with standard PHP and MySQL? Below are the secure, customized scripts needed to build your inventory table and handle image uploads. Copied code is instantly ready to run in your cPanel environment.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* SQL Table Creation */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded p-6 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <FileCode className="h-5 w-5 text-[#C5A05A]" />
                    <h3 className="font-serif text-base font-semibold text-white">MySQL Table Structure</h3>
                  </div>
                  
                  <button
                    onClick={handleCopySQL}
                    className="p-1.5 rounded bg-[#111111] hover:bg-[#222222] border border-gray-800 text-[#C5A05A] transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedSQL ? (
                      <>
                        <ClipboardCheck className="h-3.5 w-3.5 text-green-400" />
                        <span className="text-[10px] text-green-400 font-bold font-mono">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-mono">Copy SQL</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-gray-400 text-xs mb-4 leading-relaxed font-light">
                  Execute this SQL block in your cPanel <strong>phpMyAdmin</strong> SQL query panel to securely generate the <code>products</code> table. It defines optimal column lengths and safety variables.
                </p>

                <pre className="bg-[#111111] border border-gray-800 rounded p-4 text-[11px] font-mono text-gray-300 overflow-x-auto max-h-72">
                  {SQL_CODE}
                </pre>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-800/60 flex items-center justify-between text-[11px] font-mono text-gray-500">
                <span>Engines: InnoDB</span>
                <span>Charset: utf8mb4</span>
              </div>
            </div>

            {/* PHP Secure upload.php */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded p-6 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <FileCode className="h-5 w-5 text-[#C5A05A]" />
                    <h3 className="font-serif text-base font-semibold text-white">Secure php Upload Portal</h3>
                  </div>
                  
                  <button
                    onClick={handleCopyPHP}
                    className="p-1.5 rounded bg-[#111111] hover:bg-[#222222] border border-gray-800 text-[#C5A05A] transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedPHP ? (
                      <>
                        <ClipboardCheck className="h-3.5 w-3.5 text-green-400" />
                        <span className="text-[10px] text-green-400 font-bold font-mono">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-mono">Copy PHP</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-gray-400 text-xs mb-4 leading-relaxed font-light">
                  Save this code block as <code>upload.php</code> in your server's root. Make sure to replace your database user, password, and db name inside the credentials zone. Features multi-level protection:
                </p>

                <ul className="text-[11px] text-gray-400 space-y-1 mb-4 list-disc pl-4 font-light">
                  <li>Explicit Mime-Type check via <code>finfo_file()</code> (blocks executable script injects).</li>
                  <li>PDO-Prepared queries (safeguarded against standard SQL Injections).</li>
                  <li>Collision protection via unique hashing filename generators.</li>
                  <li>Sleek custom dashboard view matching Aurelius' color palette.</li>
                </ul>

                <pre className="bg-[#111111] border border-gray-800 rounded p-4 text-[11px] font-mono text-gray-300 overflow-x-auto max-h-72">
                  {PHP_CODE}
                </pre>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-800/60 flex items-center justify-between text-[11px] font-mono text-gray-500">
                <span>File Size Limit: 5MB</span>
                <span>Type: PDO MySQL Connection</span>
              </div>
            </div>

          </div>

          {/* Setup instruction card */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded p-6 space-y-4 text-xs">
            <h3 className="font-serif text-base font-semibold text-white">cPanel Setup Instructions (Namecheap Setup Step-by-Step)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans text-gray-400 leading-relaxed font-light">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-[#C5A05A] text-black font-mono font-bold flex items-center justify-center text-[10px]">1</span>
                  <h4 className="font-semibold text-white text-[12px]">Database Setup</h4>
                </div>
                <p>Log in to Namecheap cPanel, open "MySQL Database Wizard". Create a database named <code>aurelius_db</code>, assign a user, grant "ALL PRIVILEGES", and save credentials.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-[#C5A05A] text-black font-mono font-bold flex items-center justify-center text-[10px]">2</span>
                  <h4 className="font-semibold text-white text-[12px]">Create Table</h4>
                </div>
                <p>Open "phpMyAdmin" in cPanel, select your database. Go to the "SQL" query editor, copy-paste the MySQL code block from above, and hit "Go" to spin up the products table.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-[#C5A05A] text-black font-mono font-bold flex items-center justify-center text-[10px]">3</span>
                  <h4 className="font-semibold text-white text-[12px]">Upload Scripts</h4>
                </div>
                <p>Open cPanel "File Manager" and go to <code>public_html</code>. Create a file named <code>upload.php</code>, paste the PHP block above, and replace lines 3 to 6 with your database credentials. Done!</p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
