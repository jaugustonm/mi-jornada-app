const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// ======================================================================
// LA FUNCIONALIDAD DE NOTIFICACIONES HA SIDO DESACTIVADA
// Se ha comentado el código para evitar que se ejecute.
// ======================================================================
/*
// Esta función se ejecutará todos los días a las 12:00 PM y a las 8:00 PM (20:00)
// en la zona horaria de Bogotá.
exports.sendReportReminders = functions.pubsub.schedule("0 12,20 * * *")
    .timeZone("America/Bogota")
    .onRun(async (context) => {
        const db = admin.firestore();
        // Buscamos a todos los usuarios que tengan el rol de 'supervisor'
        const supervisorsSnapshot = await db.collection("users").where("role", "==", "supervisor").get();

        if (supervisorsSnapshot.empty) {
            console.log("No se encontraron supervisores.");
            return null;
        }

        const tokens = [];
        supervisorsSnapshot.forEach(doc => {
            const user = doc.data();
            // Recopilamos los tokens de los dispositivos de los supervisores
            if (user.fcmToken) {
                tokens.push(user.fcmToken);
            }
        });

        if (tokens.length > 0) {
            // Preparamos el mensaje de la notificación
            const payload = {
                notification: {
                    title: "🔔 ¡Hora de Revisar Reportes!",
                    body: "Un nuevo reporte de jornada está listo. ¡No olvides revisarlo!",
                    icon: "/icon.svg",
                },
            };

            // Enviamos la notificación a todos los tokens de los supervisores
            console.log("Enviando notificación a:", tokens);
            return admin.messaging().sendToDevice(tokens, payload);
        }

        return null;
    });
*/