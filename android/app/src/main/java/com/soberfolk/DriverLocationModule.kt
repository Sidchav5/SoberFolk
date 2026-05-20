package com.soberfolk

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DriverLocationModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "DriverLocationService"

  @ReactMethod
  fun startTracking(authToken: String, apiBaseUrl: String, promise: Promise) {
    try {
      val intent = Intent(reactContext, DriverLocationForegroundService::class.java).apply {
        putExtra(DriverLocationForegroundService.EXTRA_AUTH_TOKEN, authToken)
        putExtra(DriverLocationForegroundService.EXTRA_API_BASE_URL, apiBaseUrl)
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        reactContext.startForegroundService(intent)
      } else {
        reactContext.startService(intent)
      }

      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("DRIVER_LOCATION_START_FAILED", error)
    }
  }

  @ReactMethod
  fun stopTracking(promise: Promise) {
    try {
      val intent = Intent(reactContext, DriverLocationForegroundService::class.java)
      reactContext.stopService(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("DRIVER_LOCATION_STOP_FAILED", error)
    }
  }
}
