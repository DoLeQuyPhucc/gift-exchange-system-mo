import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Checkbox } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { uriToFile } from '@/src/utils/uriToFile';
import { RouteProp, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '@/src/layouts/types/navigationTypes';
import * as ImagePicker from 'expo-image-picker';
import Video from 'react-native-video';


import MediaUploadSection from '@/src/components/MediaUploadSection';
import { Category, ConditionOption, ItemCondition } from '@/src/shared/type';

import useCategories from '@/src/hooks/useCategories';
import useCreatePost from '@/src/hooks/useCreatePost';
import axiosInstance from '@/src/api/axiosInstance';

interface CreatePostScreenProps {
  route: RouteProp<RootStackParamList, 'CreatePost'>;
  navigation: NavigationProp<RootStackParamList>;
}

const CreatePostScreen: React.FC<CreatePostScreenProps> = ({ navigation, route }) => {
  const initialCategory = route.params?.category;
  const initialCategoryId = route.params?.categoryId;
  const { categories } = useCategories();
  const { addressData, loading, submitPost } = useCreatePost();  
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(() => {
    if (initialCategory) return initialCategory;
    if (initialCategoryId) {
      return categories.find(cat => cat.id === initialCategoryId) || null;
    }
    return null;
  });
  
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string>('');
  const [condition, setCondition] = useState<ItemCondition | ''>('');
  const [point, setPoint] = useState<string>('');
  const [isFreeGift, setIsFreeGift] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [showTitleHint, setShowTitleHint] = useState<boolean>(false);
  const [showDescriptionHint, setShowDescriptionHint] = useState<boolean>(false);

  const conditions: ConditionOption[] = [
    { id: ItemCondition.NEW, name: 'Mới' },
    { id: ItemCondition.USED, name: 'Đã sử dụng' },
  ];

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return false;
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return false;
    }
    if (!condition) {
      Alert.alert('Error', 'Please select condition');
      return false;
    }
    if (!isFreeGift && (!point || isNaN(Number(point)))) {
      Alert.alert('Error', 'Please enter valid points');
      return false;
    }
    if (images.length === 0) {
      Alert.alert('Error', 'Please upload at least one image');
      return false;
    }
    return true;
  };
  
  const uploadImageToCloudinary = async (uri: string): Promise<string> => {
    try {
      console.log('Starting upload process with URI:', uri);
  
      // Create file object
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
  
      console.log('File details:', {
        filename,
        type
      });
  
      const formData = new FormData();
  
      // Append file with proper structure
      const fileData = {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: type,
      };

      const CLOUDINARY_UPLOAD_PRESET = 'gift_system';
      const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dt4ianp80/image/upload';
  
      console.log('FormData file object:', fileData);
      formData.append('file', fileData as any);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  
      console.log('Cloudinary URL:', CLOUDINARY_URL);
      console.log('Upload preset:', CLOUDINARY_UPLOAD_PRESET);
  
      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });
  
      console.log('Response status:', response.status);
      
      // Get detailed error message if available
      const responseData = await response.json();
      console.log('Response data:', responseData);
  
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} - ${JSON.stringify(responseData)}`);
      }
  
      return responseData.secure_url;
    } catch (error: any) {
      console.error('Detailed upload error:', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  };
  
  const handleImageUpload = async () => {
    try {
      setIsUploadingImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
  
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setSelectedImage(uri);
  
        const imageUrl = await uploadImageToCloudinary(uri);
        setImages(prev => [...prev, imageUrl]);
        console.log('Image uploaded successfully:', imageUrl);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Upload Failed', 'Please try again');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled) {
        setVideo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking video:', error);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, idx) => idx !== index);
    setImages(newImages);
  };

  const removeVideo = () => {
    setVideo('');
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    console.log('Submitting post:');
    
  
    try {
      setIsLoading(true);
  
      const postData = {
        name: title.trim(),
        description: description.trim(),
        categoryId: selectedCategory!.id,
        isGift: isFreeGift,
        point: isFreeGift ? 0 : parseInt(point),
        quantity: 1,
        condition: condition,
        images
      };

      console.log("Form Data: ", postData);
  
      const result = await submitPost(postData);
      
      if (result) {
        Alert.alert('Success', 'Post created successfully');
      }

      navigation.goBack();
  
    } catch (error) {
      Alert.alert('Error', 'Failed to create post');
      console.error('Submit error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng Tin</Text>
        <View style={styles.headerSpace} />
      </View>

      <ScrollView style={styles.content}>
        {/* Category Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh Mục</Text>
          <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCategory?.id || ''}
            onValueChange={(value) => {
              const category = categories.find(cat => cat.id === value);
              setSelectedCategory(category || null);
            }}
          >
              <Picker.Item label="Chọn danh mục" value="" />
              {categories.map((category) => (
                <Picker.Item
                  key={category.id}
                  label={category.name}
                  value={category.id}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Media Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THÔNG TIN CHI TIẾT</Text>
          
          <MediaUploadSection
            images={images}
            video={video}
            selectedImage={selectedImage}
            isLoading={isUploadingImage}
            onPickImage={handleImageUpload}
            onPickVideo={pickVideo}
            onRemoveImage={removeImage}
            onRemoveVideo={removeVideo}
          />

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={condition}
              onValueChange={(value: ItemCondition | '') => setCondition(value)}
            >
              <Picker.Item label="Tình trạng" value="" />
              {conditions.map((item) => (
                <Picker.Item
                  key={item.id}
                  label={item.name}
                  value={item.id}
                />
              ))}
            </Picker>
          </View>

          <View style={styles.checkboxContainer}>
            <Checkbox
              status={isFreeGift ? 'checked' : 'unchecked'}
              onPress={() => setIsFreeGift(!isFreeGift)}
            />
            <Text>Tôi muốn cho tặng miễn phí</Text>
          </View>
        </View>

        {/* Title and Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TIÊU ĐỀ TIN ĐĂNG VÀ MÔ TẢ CHI TIẾT</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Tiêu đề tin đăng"
            value={title}
            onChangeText={setTitle}
            onFocus={() => setShowTitleHint(true)}
            onBlur={() => setShowTitleHint(false)}
          />
          {showTitleHint && (
            <Text style={styles.hint}>
              Tiêu đề tốt nên ngắn gọn, đầy đủ thông tin quan trọng
            </Text>
          )}

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Mô tả chi tiết"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            onFocus={() => setShowDescriptionHint(true)}
            onBlur={() => setShowDescriptionHint(false)}
          />

          {showDescriptionHint && (
            <Text style={styles.hint}>
              Không được phép ghi thông tin liên hệ trong mô tả
            </Text>
          )}

          {!isFreeGift && (
            <TextInput
            style={styles.input}
            placeholder="Points"
            value={point}
            onChangeText={setPoint}
            keyboardType="numeric"
            editable={!isFreeGift}
          />
          )}
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ĐỊA CHỈ</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#0000ff" />
          ) : (
            <View style={styles.addressContainer}>
              <Text style={styles.addressText}>
                {addressData?.address}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.previewButton]}
          onPress={() => {/* Handle preview */}}
        >
          <Text style={{color: "black"}}>Xem trước</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.footerButton, styles.publishButton]}
          onPress={handleSubmit}
        >
          <Text style={styles.buttonText}>Đăng bài</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 24,
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpace: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
  },
  mediaButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  uploadButton: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 4,
  },
  videoPreview: {
    width: '100%',
    height: 200,
    marginBottom: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  addressContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  addressText: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  footerButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  previewButton: {
    backgroundColor: '#f0f0f0',
  },
  publishButton: {
    backgroundColor: '#f97314',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default CreatePostScreen;