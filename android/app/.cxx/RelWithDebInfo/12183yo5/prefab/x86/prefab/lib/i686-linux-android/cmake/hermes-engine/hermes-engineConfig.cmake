if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "C:/GradleHomeSoberFolk/caches/8.14.3/transforms/635f02f56b4dd28a5c19a015b2a7f016/transformed/hermes-android-0.81.6-release/prefab/modules/libhermes/libs/android.x86/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/GradleHomeSoberFolk/caches/8.14.3/transforms/635f02f56b4dd28a5c19a015b2a7f016/transformed/hermes-android-0.81.6-release/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

