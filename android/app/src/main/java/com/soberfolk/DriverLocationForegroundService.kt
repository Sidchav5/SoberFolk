package com.soberfolk

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class DriverLocationForegroundService : Service(), LocationListener {
  private val handler = Handler(Looper.getMainLooper())
  private var locationManager: LocationManager? = null
  private var authToken: String? = null
  private var apiBaseUrl: String = DEFAULT_API_BASE_URL
  private var lastLocation: Location? = null
  private var lastUploadAt = 0L

  private val periodicUpload = object : Runnable {
    override fun run() {
      lastLocation?.let { uploadLocation(it, force = true) }
      handler.postDelayed(this, LOCATION_UPLOAD_INTERVAL_MS)
    }
  }

  override fun onCreate() {
    super.onCreate()
    locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    authToken = intent?.getStringExtra(EXTRA_AUTH_TOKEN) ?: authToken
    apiBaseUrl = intent?.getStringExtra(EXTRA_API_BASE_URL) ?: DEFAULT_API_BASE_URL

    if (authToken.isNullOrBlank()) {
      stopSelf()
      return START_NOT_STICKY
    }

    startForeground(NOTIFICATION_ID, buildNotification())
    startLocationUpdates()
    handler.removeCallbacks(periodicUpload)
    handler.postDelayed(periodicUpload, LOCATION_UPLOAD_INTERVAL_MS)

    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(periodicUpload)
    locationManager?.removeUpdates(this)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onLocationChanged(location: Location) {
    lastLocation = location
    uploadLocation(location)
  }

  @Deprecated("Deprecated in Java")
  override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit

  override fun onProviderEnabled(provider: String) = Unit

  override fun onProviderDisabled(provider: String) = Unit

  private fun startLocationUpdates() {
    if (!hasLocationPermission()) {
      stopSelf()
      return
    }

    try {
      locationManager?.requestLocationUpdates(
        LocationManager.GPS_PROVIDER,
        LOCATION_UPLOAD_INTERVAL_MS,
        0f,
        this,
      )
      locationManager?.requestLocationUpdates(
        LocationManager.NETWORK_PROVIDER,
        LOCATION_UPLOAD_INTERVAL_MS,
        0f,
        this,
      )
    } catch (securityError: SecurityException) {
      stopSelf()
    }
  }

  private fun hasLocationPermission(): Boolean {
    val fine = ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
    val coarse = ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
    return fine == PackageManager.PERMISSION_GRANTED || coarse == PackageManager.PERMISSION_GRANTED
  }

  private fun uploadLocation(location: Location, force: Boolean = false) {
    val token = authToken ?: return
    val now = System.currentTimeMillis()
    if (!force && now - lastUploadAt < LOCATION_UPLOAD_INTERVAL_MS - 1000) {
      return
    }
    lastUploadAt = now

    thread(start = true) {
      try {
        val endpoint = URL("${apiBaseUrl.trimEnd('/')}/api/location/update")
        val connection = endpoint.openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.connectTimeout = 15000
        connection.readTimeout = 15000
        connection.doOutput = true
        connection.setRequestProperty("Content-Type", "application/json")
        connection.setRequestProperty("Authorization", "Bearer $token")

        val body = """{"latitude":${location.latitude},"longitude":${location.longitude}}"""
        OutputStreamWriter(connection.outputStream).use { writer ->
          writer.write(body)
        }

        connection.inputStream.close()
        connection.disconnect()
      } catch (_: Exception) {
        // The foreground JS tracker still runs when the app is open; retry on next GPS tick.
      }
    }
  }

  private fun buildNotification() =
    NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("SoberFolk ride tracking")
      .setContentText("Sharing driver location during the active ride")
      .setOngoing(true)
      .setContentIntent(openAppIntent())
      .build()

  private fun openAppIntent(): PendingIntent {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
      ?: Intent(this, MainActivity::class.java)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    return PendingIntent.getActivity(this, 0, launchIntent, flags)
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val channel = NotificationChannel(
      CHANNEL_ID,
      "Ride location tracking",
      NotificationManager.IMPORTANCE_LOW,
    )
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(channel)
  }

  companion object {
    private const val CHANNEL_ID = "soberfolk_driver_location"
    private const val NOTIFICATION_ID = 2401
    private const val LOCATION_UPLOAD_INTERVAL_MS = 10000L
    private const val DEFAULT_API_BASE_URL = "https://soberfolks-backend.onrender.com"
    const val EXTRA_AUTH_TOKEN = "authToken"
    const val EXTRA_API_BASE_URL = "apiBaseUrl"
  }
}
