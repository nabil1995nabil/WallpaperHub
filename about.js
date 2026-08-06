// =======================================
// WallpaperHub - About JS
// =======================================

const API =
"http://localhost:3000/api/wallpapers";


// العناصر

const wallCount =
document.getElementById("wallCount");

const downloadCount =
document.getElementById("downloadCount");

const likeCount =
document.getElementById("likeCount");

const ratingCount =
document.getElementById("ratingCount");



// تحميل الإحصائيات

async function loadAboutStats(){

    try{

        const response =
        await fetch(API);


        const wallpapers =
        await response.json();



        let totalDownloads = 0;
        let totalLikes = 0;

        let ratingSum = 0;
        let ratingUsers = 0;



        wallpapers.forEach(wall=>{


            totalDownloads +=
            Number(wall.downloads || 0);


            totalLikes +=
            Number(wall.likes || 0);


            ratingSum +=
            Number(wall.ratingSum || 0);


            ratingUsers +=
            Number(wall.ratingCount || 0);


        });



        // عدد الخلفيات

        if(wallCount){

            wallCount.textContent =
            formatNumber(wallpapers.length);

        }



        // التحميلات

        if(downloadCount){

            downloadCount.textContent =
            formatNumber(totalDownloads);

        }



        // الاعجابات

        if(likeCount){

            likeCount.textContent =
            formatNumber(totalLikes);

        }



        // التقييم

        if(ratingCount){

            let avg = 0;


            if(ratingUsers > 0){

                avg =
                ratingSum / ratingUsers;

            }


            ratingCount.textContent =
            avg.toFixed(1);

        }



    }catch(error){

        console.error(
            "About Stats Error:",
            error
        );

    }

}



// تنسيق الأرقام

function formatNumber(number){

    if(number >= 1000000){

        return (
            (number / 1000000)
            .toFixed(1)
            + "M"
        );

    }


    if(number >= 1000){

        return (
            (number / 1000)
            .toFixed(1)
            + "K"
        );

    }


    return number;

}



// تشغيل

document.addEventListener(
"DOMContentLoaded",
()=>{

    loadAboutStats();

});