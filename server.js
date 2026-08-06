// ======================================
// WallpaperHub Server v2.0
// Express Edition
// ======================================

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// ================================
// Middlewares
// ================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

// ================================
// Static Files
// ================================

app.use(express.static(__dirname));

// ================================
// Paths
// ================================

const DATA_FILE =
path.join(__dirname, "data", "wallpapers.json");

console.log("DATA PATH:", DATA_FILE);

// ================================
// Read Wallpapers
// ================================

function readWallpapers(){

    try{

        const data =
        fs.readFileSync(DATA_FILE,"utf8");

        return JSON.parse(data);

    }catch(err){

        console.log(err);

        return [];

    }

}

// ================================
// Save Wallpapers
// ================================

function saveWallpapers(list){

    fs.writeFileSync(

        DATA_FILE,

        JSON.stringify(list,null,2),

        "utf8"

    );

}

// ================================
// API
// ================================

// جميع الخلفيات

app.get("/api/wallpapers",(req,res)=>{

    const wallpapers = readWallpapers();

    res.json(wallpapers);

});

// ================================
// Home
// ================================

app.get("/",(req,res)=>{

    res.sendFile(

        path.join(__dirname,"index.html")

    );

});

// ================================
// Add Wallpaper
// ================================

app.post("/api/wallpapers", (req, res) => {

    console.log(req.body);


    try {


        const wallpapers = readWallpapers();



        const newWallpaper = {


            id: Date.now(),



            title:
            req.body.title ||
            "Untitled",



            category:
            req.body.category ||
            "other",




            // نوع الخلفية
            type:
            req.body.type ||
            "image",



            // هل هي متحركة
            animated:

            req.body.type === "video" ||
            req.body.type === "gif",





            // صورة المعاينة

            thumbnail:

            req.body.thumbnail ||
            req.body.image ||
            "",




            // الملف الأساسي

            image:

            req.body.image ||
            req.body.thumbnail ||
            "",






            resolution:

            req.body.resolution ||
            "",




            size:

            req.body.size ||
            "",





            downloads:0,

            likes:0,

            views:0,




            rating:0,

            ratingCount:0,

            ratingSum:0,





            author:

            req.body.author ||
            "WallpaperHub",




            date:

            new Date()
            .toLocaleString("ar-MA"),




            colors:

            req.body.colors ||
            [],




            tags:

            req.body.tags ||
            [],






            featured:

            req.body.featured ||
            false,





            todayWallpaper:

            req.body.todayWallpaper ||
            false,





            popular:

            req.body.popular ||
            false



        };






        // منع وجود أكثر من خلفية اليوم

        if(newWallpaper.todayWallpaper){


            wallpapers.forEach(w=>{


                w.todayWallpaper =
                false;


            });


        }






        wallpapers.push(
            newWallpaper
        );





        saveWallpapers(
            wallpapers
        );





        res.json({


            success:true,


            message:
            "Wallpaper added successfully",


            wallpaper:
            newWallpaper


        });





    } catch(err){



        console.error(err);




        res.status(500).json({


            success:false,


            message:
            "Server Error"


        });



    }



});

// ================================
// Update Wallpaper
// ================================

app.put("/api/wallpapers/:id", (req, res) => {

    try {

        const wallpapers = readWallpapers();

        const id = Number(req.params.id);

        const index = wallpapers.findIndex(w => w.id === id);

        if (index === -1) {

            return res.status(404).json({

                success: false,

                message: "Wallpaper not found"

            });

        }

        wallpapers[index] = {

            ...wallpapers[index],

            ...req.body,

            id

        };

        saveWallpapers(wallpapers);

        res.json({

            success: true,

            message: "Wallpaper updated",

            wallpaper: wallpapers[index]

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "Server Error"

        });

    }

});

// ================================
// Increase Downloads
// ================================

app.post("/api/wallpapers/:id/download", (req, res) => {

    try {

        const wallpapers = readWallpapers();

        const id = Number(req.params.id);

        const wall = wallpapers.find(w => w.id === id);

        if (!wall) {

            return res.status(404).json({

                success: false,

                message: "Wallpaper not found"

            });

        }

        wall.downloads = (wall.downloads || 0) + 1;

        saveWallpapers(wallpapers);

        res.json({

            success: true,

            downloads: wall.downloads

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false

        });

    }

});

// ================================
// Like Wallpaper
// ================================

app.post("/api/wallpapers/:id/like", (req, res) => {

    try {

        const wallpapers = readWallpapers();

        const id = Number(req.params.id);

        const wall = wallpapers.find(w => w.id === id);

        if (!wall) {

            return res.status(404).json({

                success: false

            });

        }

        wall.likes = (wall.likes || 0) + 1;

        saveWallpapers(wallpapers);

        res.json({

            success: true,

            likes: wall.likes

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false

        });

    }

});

// ================================
// View Wallpaper
// ================================

app.post("/api/wallpapers/:id/view", (req, res) => {

    try {

        const wallpapers = readWallpapers();

        const id = Number(req.params.id);

        const wall = wallpapers.find(w => w.id === id);

        if (!wall) {

            return res.status(404).json({

                success: false

            });

        }

        wall.views = (wall.views || 0) + 1;

        saveWallpapers(wallpapers);

        res.json({

            success: true,

            views: wall.views

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false

        });

    }

});

// ================================
// Rate Wallpaper
// ================================

app.post("/api/wallpapers/:id/rate", (req, res) => {

    try {

        const wallpapers = readWallpapers();

        const id = Number(req.params.id);

        const wall = wallpapers.find(w => w.id === id);

        if (!wall) {

            return res.status(404).json({
                success: false
            });

        }

        const rating = Number(req.body.rating);

        if (rating < 1 || rating > 5) {

            return res.status(400).json({
                success: false
            });

        }

        wall.ratingCount = (wall.ratingCount || 0) + 1;

        wall.ratingSum = (wall.ratingSum || 0) + rating;

        wall.rating =
            Number(
                (
                    wall.ratingSum /
                    wall.ratingCount
                ).toFixed(1)
            );

        saveWallpapers(wallpapers);

        res.json({

            success: true,

            rating: wall.rating,

            ratingCount: wall.ratingCount

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false

        });

    }

});

// ================================
// Delete Wallpaper
// ================================

app.delete("/api/wallpapers/:id", (req, res) => {

    try {

        let wallpapers = readWallpapers();

        const id = Number(req.params.id);

        const index = wallpapers.findIndex(
            w => w.id === id
        );

        if (index === -1) {

            return res.status(404).json({
                success: false,
                message: "Wallpaper not found"
            });

        }

        // حذف الخلفية من البيانات فقط
        wallpapers.splice(index, 1);

        saveWallpapers(wallpapers);

        res.json({
            success: true,
            message: "Wallpaper deleted"
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

});

// ================================
// Start
// ================================

app.listen(PORT,()=>{

    console.log("");

    console.log("====================================");

    console.log(" WallpaperHub Server Started");

    console.log(" PORT:", PORT);

    console.log("====================================");

});