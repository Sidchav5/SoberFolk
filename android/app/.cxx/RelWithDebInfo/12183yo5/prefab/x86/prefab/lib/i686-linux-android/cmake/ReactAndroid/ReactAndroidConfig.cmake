if(NOT TARGET ReactAndroid::hermestooling)
add_library(ReactAndroid::hermestooling SHARED IMPORTED)
set_target_properties(ReactAndroid::hermestooling PROPERTIES
    IMPORTED_LOCATION "C:/GradleHomeSoberFolk/caches/8.14.3/transforms/9771b5709b4fcc567280383da8cb1c33/transformed/react-android-0.81.5-release/prefab/modules/hermestooling/libs/android.x86/libhermestooling.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/GradleHomeSoberFolk/caches/8.14.3/transforms/9771b5709b4fcc567280383da8cb1c33/transformed/react-android-0.81.5-release/prefab/modules/hermestooling/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::jsi)
add_library(ReactAndroid::jsi SHARED IMPORTED)
set_target_properties(ReactAndroid::jsi PROPERTIES
    IMPORTED_LOCATION "C:/GradleHomeSoberFolk/caches/8.14.3/transforms/9771b5709b4fcc567280383da8cb1c33/transformed/react-android-0.81.5-release/prefab/modules/jsi/libs/android.x86/libjsi.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/GradleHomeSoberFolk/caches/8.14.3/transforms/9771b5709b4fcc567280383da8cb1c33/transformed/react-android-0.81.5-release/prefab/modules/jsi/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::reactnative)
add_library(ReactAndroid::reactnative SHARED IMPORTED)
set_target_properties(ReactAndroid::reactnative PROPERTIES
    IMPORTED_LOCATION "C:/GradleHomeSoberFolk/caches/8.14.3/transforms/9771b5709b4fcc567280383da8cb1c33/transformed/react-android-0.81.5-release/prefab/modules/reactnative/libs/android.x86/libreactnative.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/GradleHomeSoberFolk/caches/8.14.3/transforms/9771b5709b4fcc567280383da8cb1c33/transformed/react-android-0.81.5-release/prefab/modules/reactnative/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

